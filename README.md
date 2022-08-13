# dfpwm
DFPWM encoder/decoder for JavaScript. Useful for ComputerCraft.

## Usage
This module converts between signed 8-bit PCM data and DFPWM data. A description of the DFPWM codec is available [here](https://wiki.vexatos.com/dfpwm).

```js
const dfpwm = require("dfpwm"); // require the module

// encode from signed 8-bit PCM buffer to DFPWM
let encoder = new dfpwm.Encoder(); // create an encoder
let encodedData = encoder.encode(pcmData); // encode data to DFPWM

// decode from DFPWM buffer to signed 8-bit PCM
let decoder = new dfpwm.Decoder(); // create a decoder
let decodedData = decoder.decode(encodedData); // decode data to PCM

// or do single chunks quicker: (not recommended for streaming data)
let encodedData = dfpwm.quickEncode(pcmData);
let decodedData = dfpwm.quickDecode(encodedData);

// use streams to streamline data access
fs.createReadStream("in.pcm")
    .pipe(new dfpwm.Encoder())
    .pipe(fs.createWriteStream("out.dfpwm"))
```

Encoders and decoders may be re-used for streaming audio. This helps keep audio quality better across multiple chunks.

## License
This library is licensed under the MIT license. The original DFPWM1a encoder is licensed in the public domain.

## Changelog

### 1.2.2
- Fixed an accidental debugging statement.

### 1.2.1
- Added `final` argument to `Encoder.encode` to write out the last bits that don't fit in a single byte.
- Fixed encoding multiple chunks with a size not divisible by 8.

### 1.1.1
- Adjusted encoding to fit better with DFPWM1a spec.

### 1.1.0
- `Encoder`/`Decoder` now extend from `stream.Transform`, allowing them to be used in `Stream.pipe`.

### 1.0.2
- Added TypeScript typings.

### 1.0.1
- Added readme.

### 1.0.0
- Initial release.
