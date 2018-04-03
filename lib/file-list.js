'use strict';

/**
 * FileList
 * ========
 */
const fs = require('fs');
const path = require('path');

const inherit = require('inherit');
const fileSuffix = require('file-suffix');

/**
 * FileList — класс для работы со списком файлов.
 * Умеет быстро выдавать файлы по суффиксу.
 * @name FileList
 * @class
 */
module.exports = inherit({

    /**
     * Конструктор.
     */
    __constructor() {
        this.items = [];
        this.slices = [];
        this.bySuffix = {};
    },

    /**
     * Добавляет файлы в FileList.
     * Каждый файл описывается в виде:
     * { fullname: <абсолютный путь к файлу>, name: <имя файла>, suffix: <суффикс>, mtime: <время изменения> }
     * @param {Object[]} files
     */
    addFiles(files) {
        this.slices.push(files);
        for (let i = 0, l = files.length; i < l; i++) {
            const file = files[i];
            this.items.push(file);
            (this.bySuffix[file.suffix] || (this.bySuffix[file.suffix] = [])).push(file);
        }
    },

    /**
     * Возвращает файлы по суффиксу.
     * Каждый файл описывается в виде:
     * { fullname: <абсолютный путь к файлу>, name: <имя файла>, suffix: <суффикс>, mtime: <время изменения> }
     * @param {string|string[]} suffix
     * @returns {Object[]}
     */
    getBySuffix(suffix) {
        if (Array.isArray(suffix) && suffix.length === 1) {
            suffix = suffix[0];
        }
        if (Array.isArray(suffix)) {
            const res = [];
            const suffixes = new Set(suffix);
            this.slices.forEach(slice => {
                for (let i = 0, l = slice.length; i < l; i++) {
                    const file = slice[i];
                    if (suffixes.has(file.suffix)) {
                        res.push(file);
                    }
                }
            });
            return res;
        } else {
            return this.bySuffix[suffix] || [];
        }
    },

    /**
     * Возвращает файлы по имени.
     * Каждый файл описывается в виде:
     * { fullname: <абсолютный путь к файлу>, name: <имя файла>, suffix: <суффикс>, mtime: <время изменения> }
     * @param {string} name
     * @returns {Object[]}
     */
    getByName(name) {
        return this.items.filter(file => file.name === name);
    },

    /**
     * Возвращает информацию о файле в виде:
     * { fullname: <абсолютный путь к файлу>, name: <имя файла>, suffix: <суффикс>, mtime: <время изменения> }
     */
    getFileInfo
}, {
    getFileInfo
});

function getFileInfo(filename) {
    const baseName = path.basename(filename);
    const suffix = fileSuffix(baseName);
    const stat = fs.statSync(filename);
    return {
        name: baseName,
        fullname: filename,
        suffix,
        mtime: stat.mtime.getTime(),
        isDirectory: stat.isDirectory()
    };
}
