/**
 * Strings resources for the whole application.
 */

const IMAGE_TYPE = {
    JPG: "jpg",
    PNG: "png",
    JPEG: "jpeg",
};

const IMAGE_EXTENSION = {
    JPG: "jpg",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
    GIF: "gif",
    BMP: "bmp",
};

const VIDEO_EXTENSION = {
    MP4: "mp4",
    MOV: "mov",
    FLV: "flv",
    AVI: "avi",
    WEBM: "webm",
    MKV: "mkv",
    MXF: "mxf",
    LXF: "lxf",
    "3GP": "3gp",
    GXF: "gxf",
    MPEG: "mpeg",
    MPG: "mpg",
};

module.exports = {
    ENV: {
        production: "production",
        staging: "staging",
        development: "development",
        test: "test",
    },
    IMAGE_TYPE,
    IMAGE_TYPES: Object.values(IMAGE_TYPE),
    VIDEO_EXTENSION,
    VIDEO_EXTENSIONS: Object.values(VIDEO_EXTENSION),
    IMAGE_EXTENSION,
    IMAGE_EXTENSIONS: Object.values(IMAGE_EXTENSION),
};
