import { DJState } from '../types'

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private eqLowNode: BiquadFilterNode | null = null
  private eqMidNode: BiquadFilterNode | null = null
  private eqHighNode: BiquadFilterNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private delayNode: DelayNode | null = null
  private delayFeedbackNode: GainNode | null = null
  private delayWetNode: GainNode | null = null
  private delayDryNode: GainNode | null = null
  private convolverNode: ConvolverNode | null = null
  private reverbWetNode: GainNode | null = null
  private reverbDryNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  private audioElement: HTMLAudioElement | HTMLVideoElement | null = null
  private isInitialized = false

  initialize(element: HTMLAudioElement | HTMLVideoElement) {
    if (this.isInitialized && this.audioElement === element) {
      return
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.audioElement = element

      this.sourceNode = this.audioContext.createMediaElementSource(element)

      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1.0

      this.eqLowNode = this.audioContext.createBiquadFilter()
      this.eqLowNode.type = 'lowshelf'
      this.eqLowNode.frequency.value = 250
      this.eqLowNode.gain.value = 0

      this.eqMidNode = this.audioContext.createBiquadFilter()
      this.eqMidNode.type = 'peaking'
      this.eqMidNode.frequency.value = 1000
      this.eqMidNode.Q.value = 1.0
      this.eqMidNode.gain.value = 0

      this.eqHighNode = this.audioContext.createBiquadFilter()
      this.eqHighNode.type = 'highshelf'
      this.eqHighNode.frequency.value = 4000
      this.eqHighNode.gain.value = 0

      this.filterNode = this.audioContext.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.value = 20000
      this.filterNode.Q.value = 1.0

      this.delayNode = this.audioContext.createDelay(5.0)
      this.delayNode.delayTime.value = 0.5

      this.delayFeedbackNode = this.audioContext.createGain()
      this.delayFeedbackNode.gain.value = 0.3

      this.delayWetNode = this.audioContext.createGain()
      this.delayWetNode.gain.value = 0

      this.delayDryNode = this.audioContext.createGain()
      this.delayDryNode.gain.value = 1.0

      this.convolverNode = this.audioContext.createConvolver()
      this.createReverbImpulse(2.0, 0.5)

      this.reverbWetNode = this.audioContext.createGain()
      this.reverbWetNode.gain.value = 0

      this.reverbDryNode = this.audioContext.createGain()
      this.reverbDryNode.gain.value = 1.0

      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8

      this.sourceNode
        .connect(this.gainNode)
        .connect(this.eqLowNode)
        .connect(this.eqMidNode)
        .connect(this.eqHighNode)
        .connect(this.filterNode)

      this.filterNode.connect(this.delayDryNode)
      this.filterNode.connect(this.delayNode)
      this.delayNode.connect(this.delayFeedbackNode)
      this.delayFeedbackNode.connect(this.delayNode)
      this.delayNode.connect(this.delayWetNode)

      const delayMerger = this.audioContext.createGain()
      this.delayDryNode.connect(delayMerger)
      this.delayWetNode.connect(delayMerger)

      delayMerger.connect(this.reverbDryNode)
      delayMerger.connect(this.convolverNode)
      this.convolverNode.connect(this.reverbWetNode)

      const reverbMerger = this.audioContext.createGain()
      this.reverbDryNode.connect(reverbMerger)
      this.reverbWetNode.connect(reverbMerger)

      reverbMerger.connect(this.analyserNode)
      this.analyserNode.connect(this.audioContext.destination)

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize audio engine:', error)
    }
  }

  private createReverbImpulse(duration: number, decay: number) {
    if (!this.audioContext || !this.convolverNode) return

    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const impulse = this.audioContext.createBuffer(2, length, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }

    this.convolverNode.buffer = impulse
  }

  applyDJState(state: DJState) {
    if (!this.isInitialized) return

    this.setVolume(state.deck1Volume / 100)

    this.setEQ(state.eq.low, state.eq.mid, state.eq.high)

    if (state.filter.type === 'hpf') {
      this.setFilter('highpass', state.filter.frequency, state.filter.resonance)
    } else if (state.filter.type === 'lpf') {
      this.setFilter('lowpass', state.filter.frequency, state.filter.resonance)
    } else {
      this.resetFilter()
    }

    this.setDelay(
      state.effects.delay.enabled,
      state.effects.delay.time,
      state.effects.delay.feedback,
      state.effects.delay.wetDry
    )

    this.setReverb(
      state.effects.reverb.enabled,
      state.effects.reverb.roomSize,
      state.effects.reverb.dampening,
      state.effects.reverb.wetDry
    )

    if (this.audioElement && state.tempo !== 100) {
      const rate = state.tempo / 100
      this.audioElement.playbackRate = state.keyLock ? rate : 1.0
      if (!state.keyLock && this.audioContext) {
        this.audioContext.resume()
      }
    }
  }

  setVolume(volume: number) {
    if (!this.gainNode) return
    this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext!.currentTime)
  }

  setEQ(low: number, mid: number, high: number) {
    if (!this.eqLowNode || !this.eqMidNode || !this.eqHighNode) return

    this.eqLowNode.gain.setValueAtTime(low, this.audioContext!.currentTime)
    this.eqMidNode.gain.setValueAtTime(mid, this.audioContext!.currentTime)
    this.eqHighNode.gain.setValueAtTime(high, this.audioContext!.currentTime)
  }

  setFilter(type: 'lowpass' | 'highpass', frequency: number, resonance: number) {
    if (!this.filterNode) return

    this.filterNode.type = type
    this.filterNode.frequency.setValueAtTime(frequency, this.audioContext!.currentTime)
    this.filterNode.Q.setValueAtTime(resonance, this.audioContext!.currentTime)
  }

  resetFilter() {
    if (!this.filterNode) return
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.setValueAtTime(20000, this.audioContext!.currentTime)
    this.filterNode.Q.setValueAtTime(1.0, this.audioContext!.currentTime)
  }

  setDelay(enabled: boolean, time: number, feedback: number, wetDry: number) {
    if (!this.delayNode || !this.delayFeedbackNode || !this.delayWetNode || !this.delayDryNode) return

    this.delayNode.delayTime.setValueAtTime(time, this.audioContext!.currentTime)
    this.delayFeedbackNode.gain.setValueAtTime(feedback, this.audioContext!.currentTime)

    if (enabled) {
      this.delayWetNode.gain.setValueAtTime(wetDry, this.audioContext!.currentTime)
      this.delayDryNode.gain.setValueAtTime(1 - wetDry, this.audioContext!.currentTime)
    } else {
      this.delayWetNode.gain.setValueAtTime(0, this.audioContext!.currentTime)
      this.delayDryNode.gain.setValueAtTime(1, this.audioContext!.currentTime)
    }
  }

  setReverb(enabled: boolean, roomSize: number, dampening: number, wetDry: number) {
    if (!this.convolverNode || !this.reverbWetNode || !this.reverbDryNode) return

    this.createReverbImpulse(roomSize * 4, dampening)

    if (enabled) {
      this.reverbWetNode.gain.setValueAtTime(wetDry, this.audioContext!.currentTime)
      this.reverbDryNode.gain.setValueAtTime(1 - wetDry, this.audioContext!.currentTime)
    } else {
      this.reverbWetNode.gain.setValueAtTime(0, this.audioContext!.currentTime)
      this.reverbDryNode.gain.setValueAtTime(1, this.audioContext!.currentTime)
    }
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyserNode) return null

    const bufferLength = this.analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyserNode.getByteFrequencyData(dataArray)

    return dataArray
  }

  getWaveformData(): Uint8Array | null {
    if (!this.analyserNode) return null

    const bufferLength = this.analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyserNode.getByteTimeDomainData(dataArray)

    return dataArray
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  suspend() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend()
    }
  }

  disconnect() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch (e) {
      }
    }

    if (this.audioContext) {
      this.audioContext.close()
    }

    this.isInitialized = false
  }
}

export const audioEngine = new AudioEngine()
