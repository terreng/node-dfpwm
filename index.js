const {Buffer} = require("buffer");
const {Transform} = require("stream");

const CONST_PREC = 10;
const CONST_POSTFILT = 140;

// DFPWM transcoder from https://github.com/ChenThread/dfpwm/blob/master/1a/

class Encoder extends Transform {
    /**
     * Creates a new encoder.
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(q, s, lt) {
        super();
        if (q !== undefined && q !== null && typeof q !== "number") throw TypeError("Argument #1 must be a number.");
        if (s !== undefined && s !== null && typeof s !== "number") throw TypeError("Argument #2 must be a number.");
        if (lt !== undefined && lt !== null && typeof lt !== "number") throw TypeError("Argument #3 must be a number.");
        this.q = q || 0;
        this.s = s || 0;
        this.lt = lt || -128;
        this.pending = null;
    }
    /**
     * Encodes a buffer of 8-bit signed PCM data to 1-bit DFPWM.
     * @param {Buffer} buffer The PCM buffer to encode.
     * @param {boolean?} final Whether this is the last chunk.
     * @returns {Buffer} The resulting DFPWM data.
     */
    encode(buffer, final) {
        if (!(buffer instanceof Buffer)) throw TypeError("Argument #1 must be a Buffer.");
        let buf = buffer;
        if (this.pending) buf = Buffer.concat([this.pending, buffer]);
        if (buf.length % 8 < 1) final = false;
        const len = (final ? Math.ceil : Math.floor)(buf.length / 8);
        let output = Buffer.alloc(len);
        for (let i = 0; i < len; i++) {
            let d = 0;
            for (let j = 0; j < (final && i === len - 1 ? buf.length % 8 : 8); j++) {
                // get sample
                let v = buf.readInt8(i*8+j);
                // set bit / target
                let t = (v > this.q || (v === this.q && v === 127) ? 127 : -128);
                d >>= 1;
                if (t > 0) d |= 0x80;

                // adjust charge
                let nq = this.q + ((this.s * (t-this.q) + (1<<(CONST_PREC-1)))>>CONST_PREC);
                if (nq === this.q && nq !== t) nq += (t === 127 ? 1 : -1);
                this.q = nq;

                // adjust strength
                let st = (t !== this.lt ? 0 : (1<<CONST_PREC)-1);
                let ns = this.s;
                if (ns !== st) ns += (st !== 0 ? 1 : -1);
                if (CONST_PREC > 8 && ns < (1<<(CONST_PREC-7))) ns = (1<<(CONST_PREC-7));
                this.s = ns;

                this.lt = t;
            }

            // output bits
            if (final && i === len - 1) d >>= 8 - (buf.length % 8);
            output.writeUInt8(d, i);
        }
        if (!final && buf.length % 8 > 0) this.pending = buf.subarray(-(buf.length % 8));
        else this.pending = null;
        return output;
    }

    _transform(chunk, encoding, callback) {
        callback(null, this.encode(chunk));
    }

    _flush(callback) {
        if (this.pending !== null) callback(null, this.encode(Buffer.alloc(0), true));
    }
}

class Decoder extends Transform {
    /**
     * Creates a new decoder.
     * @param {number?} fq
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(fq, q, s, lt) {
        super();
        if (fq !== undefined && fq !== null && typeof fq !== "number") throw TypeError("Argument #1 must be a number.");
        if (q !== undefined && q !== null && typeof q !== "number") throw TypeError("Argument #2 must be a number.");
        if (s !== undefined && s !== null && typeof s !== "number") throw TypeError("Argument #3 must be a number.");
        if (lt !== undefined && lt !== null && typeof lt !== "number") throw TypeError("Argument #4 must be a number.");
        this.fq = fq || 0;
        this.q = q || 0;
        this.s = s || 0;
        this.lt = lt || -128;
    }
    /**
     * Encodes a buffer of 1-bit DFPWM data to 8-bit signed PCM.
     * @param {Buffer} buffer The DFPWM buffer to decode.
     * @param {number?} fs
     * @returns {Buffer} The resulting PCM data.
     */
    decode(buffer, fs) {
        if (!(buffer instanceof Buffer)) throw TypeError("Argument #1 must be a Buffer.");
        if (fs !== undefined && fs !== null && typeof fs !== "number") throw TypeError("Argument #2 must be a number.");
        fs = fs || CONST_POSTFILT;
        let inpos = 0;
        let outpos = 0;
        let output = Buffer.alloc(buffer.length * 8);
        for (let i = 0; i < buffer.length; i++) {
            // get bits
            let d = buffer.readUInt8(inpos++);
            for (let j = 0; j < 8; j++) {
                // set target
                let t = ((d&1) ? 127 : -128);
                d >>= 1;

                // adjust charge
                let nq = this.q + ((this.s * (t-this.q) + (1<<(CONST_PREC-1)))>>CONST_PREC);
                if (nq === this.q && nq !== t) this.q += (t === 127 ? 1 : -1);
                let lq = this.q;
                this.q = nq;

                // adjust strength
                let st = (t !== this.lt ? 0 : (1<<CONST_PREC)-1);
                let ns = this.s;
                if (ns !== st) ns += (st !== 0 ? 1 : -1);
                if (CONST_PREC > 8 && ns < (1<<(CONST_PREC-7))) ns = (1<<(CONST_PREC-7));
                this.s = ns;

                // FILTER: perform antijerk
                let ov = (t !== this.lt ? (nq+lq+1)>>1 : nq);

                // FILTER: perform LPF
                this.fq += ((fs*(ov-this.fq) + 0x80)>>8);
                ov = this.fq;

                // output sample
                output.writeInt8(ov, outpos++);

                this.lt = t;
            }
        }
        return output;
    }

    _transform(chunk, encoding, callback) {
        callback(null, decode(chunk));
    }
}

/**
 * Quickly encodes a single chunk of PCM audio to DFPWM.
 * @param {Buffer} buffer The PCM buffer to encode.
 * @returns {Buffer} The resulting DFPWM data.
 */
function encode(data) {
    return (new Encoder()).encode(data, true);
}

/**
 * Quickly decodes a single chunk of DFPWM audio to PCM.
 * @param {Buffer} buffer The DFPWM buffer to decode.
 * @param {number?} fs
 * @returns {Buffer} The resulting PCM data.
 */
function decode(data, fs) {
    return (new Decoder()).decode(data, fs);
}

module.exports = {
    Decoder: Decoder,
    Encoder: Encoder,
    quickEncode: encode,
    quickDecode: decode
};
