const {Buffer} = require("buffer");

const CONST_PREC = 10;
const CONST_POSTFILT = 140;

// DFPWM transcoder from https://github.com/ChenThread/dfpwm/blob/master/1a/

class Encoder {
    /**
     * Creates a new encoder.
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(q, s, lt) {
        if (q !== undefined && q !== null && typeof q !== "number") throw TypeError("Argument #1 must be a number.");
        if (s !== undefined && s !== null && typeof s !== "number") throw TypeError("Argument #2 must be a number.");
        if (lt !== undefined && lt !== null && typeof lt !== "number") throw TypeError("Argument #3 must be a number.");
        this.q = q || 0;
        this.s = s || 0;
        this.lt = lt || -128;
    }
    /**
     * Encodes a buffer of 8-bit signed PCM data to 1-bit DFPWM.
     * @param {Buffer} buffer The PCM buffer to encode.
     * @returns {Buffer} The resulting DFPWM data.
     */
    encode(buffer) {
        if (!(buffer instanceof Buffer)) throw TypeError("Argument #1 must be a Buffer.");
        let d = 0;
        let inpos = 0;
        let outpos = 0;
        let output = Buffer.alloc(Math.ceil(buffer.length / 8));
        for (let i = 0; i < Math.floor(buffer.length / 8); i++) {
            for (let j = 0; j < 8; j++) {
                // get sample
                let v = buffer.readInt8(inpos++);
                // set bit / target
                let t = (v < this.q || v == -128 ? -128 : 127);
                d >>= 1;
                if (t > 0) d |= 0x80;

                // adjust charge
                let nq = this.q + ((this.s * (t-this.q) + (1<<(CONST_PREC-1)))>>CONST_PREC);
                if (nq == this.q && nq != t) nq += (t == 127 ? 1 : -1);
                this.q = nq;

                // adjust strength
                let st = (t != this.lt ? 0 : (1<<CONST_PREC)-1);
                let ns = this.s;
                if (ns != st) ns += (st != 0 ? 1 : -1);
                if (CONST_PREC > 8 && ns < 1+(1<<(CONST_PREC-8))) ns = 1+(1<<(CONST_PREC-8));
                this.s = ns;

                this.lt = t;
            }

            // output bits
            output.writeUInt8(d, outpos++);
        }
        return output;
    }
}

class Decoder {
    /**
     * Creates a new decoder.
     * @param {number?} fq
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(fq, q, s, lt) {
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
     * @param {Buffer} buffer The DFPWM buffer to encode.
     * @param {number?} fs
     * @returns {Buffer} The resulting PCM data.
     */
    decode(buffer, fs) {
        if (!(buffer instanceof Buffer)) throw TypeError("Argument #1 must be a Buffer.");
        if (fs !== undefined && fs !== null && typeof fs !== "number") throw TypeError("Argument #2 must be a number.");
        fs = fs || 100;
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
                if (nq == this.q && nq != t) this.q += (t == 127 ? 1 : -1);
                let lq = this.q;
                this.q = nq;

                // adjust strength
                let st = (t != this.lt ? 0 : (1<<CONST_PREC)-1);
                let ns = this.s;
                if (ns != st) ns += (st != 0 ? 1 : -1);
                if (CONST_PREC > 8 && ns < 1+(1<<(CONST_PREC-8))) ns = 1+(1<<(CONST_PREC-8));
                this.s = ns;

                // FILTER: perform antijerk
                let ov = (t != this.lt ? (nq+lq)>>1 : nq);

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
}

function encode(data) {
    return (new Encoder()).encode(data);
}

function decode(data, fq) {
    return (new Decoder()).decode(data, fq);
}

module.exports = {
    Decoder: Decoder,
    Encoder: Encoder,
    quickEncode: encode,
    quickDecode: decode
};
