/*
 * Copyright 2022 (c) Ayase Minori, All Rights Reserved.
 * Danielsort is a program that is supposed to sort files inside a directory based on their filetype.
 * The program does this in a destructive manner so if you wanna use it, please be aware of this,
 * although the program is designed to leave a backup of the files it sorts.
 * 
 * And yes, this is named after the person with a dreadful taste with folder organization.
 */
import * as fs from "https://deno.land/std@0.166.0/node/fs.ts";
import * as path from "https://deno.land/std@0.166.0/node/path.ts";
import { mime } from "https://deno.land/x/mimetypes@v1.0.0/mod.ts";
import { compress } from "https://deno.land/x/zip@v1.2.4/mod.ts";
import os from "https://deno.land/x/dos@v0.11.0/mod.ts";
const files: string[] =  [];

// infer basePath from cwd or let user define it.
// make sure we get the absolute path from a relative path argument
const basePath = path.resolve(Deno.args[0] || Deno.cwd());

// regex for some application formats that identify as application/ but actually are document files
const OFFICE_OPEN_XML_REGEX = /application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml|presentationml|spreadsheetml)\.document/gi;
const PDF_YML_CSV_REGEX = /application\/(?:pdf|yaml|csv)/gi;
const expectedFolders = ["Documents", "Pictures", "Videos", "Audio", "Applications", "Miscellaneous"];
const documentFolder = path.join(basePath, expectedFolders[0]);
const imageFolder = path.join(basePath, expectedFolders[1]);
const audioFolder = path.join(basePath, expectedFolders[3]);
const videoFolder = path.join(basePath, expectedFolders[2]);
const applicationsFolder = path.join(basePath, expectedFolders[4]);
const miscFolder = path.join(basePath, expectedFolders[5]);


/**
 * walks through the directory recursively and returns all the files inside it.
 * @param directory the directory to walk through
 */
function *walkSync(directory: string): Generator<string> {
    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        if (file.isDirectory()) yield* walkSync(path.join(directory, file.name as string));
        else yield path.join(path.join(directory, file.name as string));
    }
}

/**
 * Gets all the files and puts them in an array including files inside subdirectories
 * @param rootPath 
 */
function getAllFiles(rootPath : string, targetArray: Array<string>): void {
    for (const file of walkSync(rootPath)) {
        targetArray.push(file);
    }
}

// check if it's a valid path
if (!fs.existsSync(basePath)) {
    throw new Error(`${basePath} is not a valid path`);
}

// before everything else, let's make a backup of the original folder
console.log(`Making a backup of the original folder at ${os.homeDir()}/${path.basename(basePath)}.bak.zip`);
const archiveStatus = await compress(basePath, `${os.homeDir()}/${path.basename(basePath)}.bak.zip`, { overwrite: true });
if (!archiveStatus) throw new Error("Failed to make a backup of the original folder!");

getAllFiles(basePath, files);
console.log("Files found: ", files.length);
files.forEach((file) => console.log(file));
console.log("Now sorting files...");

// sort the files
files.forEach((file) => {
    const fType = mime.getType(file);

    if (fType?.match(OFFICE_OPEN_XML_REGEX)) {
        if (!fs.existsSync(documentFolder)) fs.mkdirSync(documentFolder);
        console.log(`Moving ${file} to ${documentFolder}`);
        fs.renameSync(file, path.join(documentFolder, path.basename(file)));
    } else if (fType?.match(PDF_YML_CSV_REGEX)) {
        if (!fs.existsSync(documentFolder)) fs.mkdirSync(documentFolder);
        console.log(`Moving ${file} to ${documentFolder}`);
        fs.renameSync(file, path.join(documentFolder, path.basename(file)));
    } else if (fType?.startsWith("text")) {
        if (!fs.existsSync(documentFolder)) fs.mkdirSync(documentFolder);
        console.log(`Moving ${file} to ${documentFolder}`);
        fs.renameSync(file, path.join(documentFolder, path.basename(file)));
    } else if (fType?.startsWith("image")) {
        if (!fs.existsSync(imageFolder)) fs.mkdirSync(imageFolder);
        console.log(`Moving ${file} to ${imageFolder}`);
        fs.renameSync(file, path.join(imageFolder, path.basename(file)));
    } else if (fType?.startsWith("video")) {
        if (!fs.existsSync(videoFolder)) fs.mkdirSync(videoFolder);
        console.log(`Moving ${file} to ${videoFolder}`);
        fs.renameSync(file, path.join(videoFolder, path.basename(file)));
    } else if (fType?.startsWith("audio")) {
        if (!fs.existsSync(audioFolder)) fs.mkdirSync(audioFolder);
        console.log(`Moving ${file} to ${audioFolder}`);
        fs.renameSync(file, path.join(audioFolder, path.basename(file)));
    } else if (fType?.startsWith("application")) {
        if (!fs.existsSync(applicationsFolder)) fs.mkdirSync(applicationsFolder);
        console.log(`Moving ${file} to ${applicationsFolder}`);
        fs.renameSync(file, path.join(applicationsFolder, path.basename(file)));
    } else {
        if (!fs.existsSync(miscFolder)) fs.mkdirSync(miscFolder);
        console.log(`Moving ${file} to ${miscFolder}`);
        fs.renameSync(file, path.join(miscFolder, path.basename(file)));
    }
});

// remove folders that are empty and not we're expecting to exist
fs.readdirSync(basePath).forEach((folder) => {
    if (!expectedFolders.includes(folder)) {
        fs.rmdirSync(path.join(basePath, folder), { recursive: true });
    }
});