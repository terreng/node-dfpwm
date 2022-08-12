import {Buffer} from 'buffer';
import {Transform} from 'stream';

export class Encoder extends Transform {
    q: number;
    s: number;
    t: number;
    /**
     * Creates a new encoder.
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(q?: number, s?: number, lt?: number);

    /**
     * Encodes a buffer of 8-bit signed PCM data to 1-bit DFPWM.
     * @param {Buffer} buffer The PCM buffer to encode.
     * @param {boolean?} final Whether this is the last chunk.
     * @returns {Buffer} The resulting DFPWM data.
     */
    encode(buffer: Buffer, final?: boolean): Buffer;
}

export class Decoder extends Transform {
    fq: number;
    q: number;
    s: number;
    t: number;
    /**
     * Creates a new decoder.
     * @param {number?} fq
     * @param {number?} q
     * @param {number?} s
     * @param {number?} lt
     */
    constructor(fq?: number, q?: number, s?: number, lt?: number);

    /**
     * Encodes a buffer of 1-bit DFPWM data to 8-bit signed PCM.
     * @param {Buffer} buffer The DFPWM buffer to encode.
     * @param {number?} fs
     * @returns {Buffer} The resulting PCM data.
     */
    decode(buffer: Buffer, fs?: number): Buffer;
}

/**
 * Quickly encodes a single chunk of PCM audio to DFPWM.
 * @param {Buffer} buffer The PCM buffer to encode.
 * @returns {Buffer} The resulting DFPWM data.
 */
export function quickEncode(data: Buffer): Buffer;

/**
 * Quickly decodes a single chunk of DFPWM audio to PCM.
 * @param {Buffer} buffer The DFPWM buffer to decode.
 * @param {number?} fs
 * @returns {Buffer} The resulting PCM data.
 */
export function quickDecode(data: Buffer): Buffer;
