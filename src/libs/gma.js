const fs = require('fs')
const lzma = require('lzma-native')
const path = require('path')

/** @param buffer {Buffer} */
const extractGma = async (buffer, outputPath) => {
    let pointer = 0

    const requireBytes = (size) => {
        if (size > buffer.length - pointer) {
            throw new Error(`Truncated GMA at offset ${pointer}: expected ${size} bytes`)
        }
    }

    const readUInt32 = () => {
        requireBytes(4)
        const value = buffer.readUInt32LE(pointer)
        pointer += 4
        return value
    }

    const readString = () => {
        const end = buffer.indexOf(0, pointer)
        if (end === -1) {
            throw new Error(`Unterminated GMA string at offset ${pointer}`)
        }

        const value = buffer.toString('utf8', pointer, end)
        pointer = end + 1
        return value
    }

    requireBytes(21)
    if (buffer.toString('ascii', 0, 4) !== 'GMAD') {
        throw new Error('Invalid GMA signature')
    }

    const version = buffer[4]
    if (version < 1 || version > 3) {
        throw new Error(`Unsupported GMA version: ${version}`)
    }

    pointer = 21

    // В версии 1 списка required content ещё нет.
    if (version > 1) {
        while (readString() !== '') {}
    }

    readString()
    readString()
    readString()
    readUInt32()

    const files = []
    const root = path.resolve(outputPath)

    while (readUInt32() !== 0) {
        const file = readString()
        requireBytes(8)
        const size = buffer.readBigInt64LE(pointer)
        pointer += 8
        const crc = readUInt32()

        if (size < 0n || size > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error(`Invalid GMA file size for ${file}: ${size}`)
        }

        const destination = path.resolve(root, file)
        const relative = path.relative(root, destination)
        if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error(`Invalid GMA file path: ${file}`)
        }

        files.push({ file, size: Number(size), crc, destination })
    }

    for (const file of files) {
        requireBytes(file.size)
        const content = buffer.subarray(pointer, pointer + file.size)
        pointer += file.size

        // gmad -nocrc записывает 0 вместо контрольной суммы.
        if (file.crc !== 0) {
            const actualCrc = lzma.crc32(content)
            if (file.crc !== actualCrc) {
                throw new Error(`CRC32 mismatch for ${file.file}: expected ${file.crc}, got ${actualCrc}`)
            }
        }

        await fs.promises.mkdir(path.dirname(file.destination), { recursive: true })
        await fs.promises.writeFile(file.destination, content)
    }
}

module.exports = { extractGma }
