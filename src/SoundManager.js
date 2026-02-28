/**
 * SoundManager.js
 *
 * Generates subtle audio feedback using the Web Audio API (no external files needed).
 * All sounds are synthesized procedurally:
 *  - LiDAR sweep tick (soft click on each scan cycle)
 *  - Goal reached chime (ascending two-tone beep)
 *  - Collision bump (low thud)
 *  - Exploration complete fanfare (three-note ascending)
 */
export class SoundManager {
    constructor() {
        this.enabled = false;
        this.ctx = null; // AudioContext — created on first user interaction
        this.masterGain = null;
        this.volume = 0.3;

        // Throttle: don't spam the same sound too often
        this._lastCollisionTime = 0;
        this._lastSweepTime = 0;
    }

    /**
     * Initialise the AudioContext. Must be called from a user gesture handler
     * to satisfy browser autoplay policies.
     */
    _ensureContext() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this._ensureContext();
        }
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.masterGain) {
            this.masterGain.gain.value = vol;
        }
    }

    /**
     * Soft tick sound for LiDAR sweep (called once per ~10 frames, not every frame).
     */
    playSweepTick() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this._lastSweepTime < 0.15) return; // throttle to ~7Hz max
        this._lastSweepTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1800;
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    /**
     * Two-tone ascending chime when reaching a navigation goal.
     */
    playGoalReached() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Note 1
        this._playTone(523.25, now, 0.12, 0.15);       // C5
        // Note 2 (higher, slightly delayed)
        this._playTone(659.25, now + 0.12, 0.12, 0.15); // E5
    }

    /**
     * Low thud when the robot collides with a wall.
     */
    playCollision() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this._lastCollisionTime < 0.3) return; // throttle
        this._lastCollisionTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Three-note ascending fanfare when map is fully explored.
     */
    playExplorationComplete() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        this._playTone(523.25, now, 0.15, 0.2);         // C5
        this._playTone(659.25, now + 0.18, 0.15, 0.2);  // E5
        this._playTone(783.99, now + 0.36, 0.25, 0.25);  // G5
    }

    /**
     * Helper: play a single sine tone.
     */
    _playTone(freq, startTime, duration, gain = 0.15) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }
}
