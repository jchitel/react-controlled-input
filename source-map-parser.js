const fs = require('fs');

const contents = fs.readFileSync('./dist/example.60186789.map');
const parsed = JSON.parse(contents);

// array mapping 6-bit numbers (0-63) to their corresponding base64 encoded character
const base64Encoder = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '+', '/'
];

// object mapping base64 encoded characters back to their corresponding 6-bit number (0-63)
const base64Decoder = base64Encoder.reduce((obj, v, i) => ({ ...obj, [v]: i }), {});

// Some constants defined by the spec.
const SHIFT = 5; // amount to shift by between digits
const MASK = (1 << SHIFT) - 1; // mask of actual value within VLQ
const CONTINUED = 1 << SHIFT; // mask of the continuation bit within VLQ

// Decode a single base64 digit.
function decode64(input) {
    if (input in base64Decoder) {
        return base64Decoder[input];
    }
    throw new Error(`Invalid base64 character ${input}`);
}

/// Decode a single VLQ value from the input, returning the value.
///
/// # Range
///
/// Supports all numbers that can be represented by a sign bit and a 63 bit
/// absolute value: `[-(2^63 - 1), 2^63 - 1]`.
///
/// Note that `i64::MIN = -(2^63)` cannot be represented in that form, and this
/// function will return `Error::Overflowed` when attempting to decode it.
function decodeVlq(buffer, input) {
    let accum = 0;
    let shift = 0;

    let keep_going = true;
    while (keep_going) {
        let byte = buffer.value;
        buffer = input.next();
        if (!byte) throw new Error('Unexpected end of input');
        let digit = decode64(byte);
        keep_going = (digit & CONTINUED) !== 0;

        let digit_value = (digit & MASK) << shift;

        accum += digit_value;
        shift += SHIFT;
    }

    let abs_value = accum / 2;
    if (abs_value > Number.MAX_SAFE_INTEGER) {
        throw new Error('Overflowed value');
    }

    // The low bit holds the sign.
    if ((accum & 1) !== 0) {
        return [-abs_value, buffer];
    } else {
        return [abs_value, buffer];
    }
}

/// Parse a source map's `"mappings"` string into a queryable `Mappings`
/// structure.
function parse_mappings(input) {
    let generated_line = 0;
    let generated_column = 0;
    let original_line = 0;
    let original_column = 0;
    let source = 0;
    let name = 0;

    let mappings = {};

    // `input.len() / 2` is the upper bound on how many mappings the string
    // might contain. There would be some sequence like `A,A,A,...` or
    // `A;A;A;...`.
    let by_generated = [];

    input = input[Symbol.iterator]();
    let buffer = input.next();

    while (!buffer.done) {
        const byte = buffer.value;
        if (byte === ';') {
            generated_line += 1;
            generated_column = 0;
            buffer = input.next();
        } else if (byte === ',') {
            buffer = input.next();
        } else {
            let mapping = {};
            mapping.generated_line = generated_line;

            // First is a generated column that is always present.
            [generated_column, buffer] = read_relative_vlq(generated_column, buffer, input);
            mapping.generated_column = generated_column;

            // Read source, original line, and original column if the
            // mapping has them.
            mapping.original = (buffer.value === ';' || buffer.value === ',') ? null : (() => {
                [source, buffer] = read_relative_vlq(source, buffer, input);
                [original_line, buffer] = read_relative_vlq(original_line, buffer, input);
                [original_column, buffer] = read_relative_vlq(original_column, buffer, input);

                return {
                    source,
                    original_line,
                    original_column,
                    name: (buffer.value === ';' || buffer.value === ',') ? null : (() => {
                        [name, buffer] = read_relative_vlq(name, buffer, input);
                        return name;
                    })()
                }
            })();

            console.log('Parsed mapping:', mapping);
            by_generated.push(mapping);
        }
    }

    mappings.by_generated = by_generated;
    return mappings;
}

function read_relative_vlq(previous, buffer, input) {
    let decoded;
    [decoded, buffer] = decodeVlq(buffer, input);
    let new_ = previous + decoded;

    if (new_ < 0) {
        throw new Error('Number shouldnt be negative, yo');
    }

    return [new_, buffer];
}

// version of source map spec being used (should be 3)
console.log('Source map version:', parsed.version);
// list of source files being mapped to, relative to the sourceRoot path
console.log('Source map sources:', parsed.sources);
// list of named symbols from the source that correspond to compiled/mangled names in the generated file
console.log('Source map names:', parsed.names.toString().length);
// string containing the mapping data, split up by ';' that separate lines, and ',' that separate segments
console.log('Source map mappings:', parsed.mappings.toString().length);
// the name of the file containing the source map
console.log('Source map file:', parsed.file);
// path of the root directory containing sources, relative to the map file
console.log('Source map source root:', parsed.sourceRoot);
// array corresponding to each item in the sources array containing the contents of those source files
console.log('Source map sources content:', parsed.sourcesContent.toString().length);

console.log();
console.log(parse_mappings(parsed.mappings));
