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

const fileTypeSorting = [
    {
        match: fType => fType?.match(OFFICE_OPEN_XML_REGEX) || fType?.match(PDF_YML_CSV_REGEX) || fType?.startsWith("text"),
        folder: documentFolder
    },
    {
        match: fType => fType?.startsWith("image"),
        folder: imageFolder
    },
    {
        match: fType => fType?.startsWith("video"),
        folder: videoFolder
    },
    {
        match: fType => fType?.startsWith("audio"),
        folder: audioFolder
    },
    {
        match: fType => fType?.startsWith("application"),
        folder: applicationsFolder
    },
    {
        match: fType => true,
        folder: miscFolder
    }
];

// sort the files
for (const file of files) {
    const fType = mime.getType(file);

    for (const { match, folder } of fileTypeSorting) {
        if (match(fType)) {
            if (!fs.existsSync(folder)) fs.mkdirSync(folder);
            console.log(`Moving ${file} to ${folder}`);
            fs.renameSync(file, path.join(folder, path.basename(file)));
            break;
        }
    }
}

// remove folders that are empty and not we're expecting to exist
fs.readdirSync(basePath).forEach((folder) => {
    if (!expectedFolders.includes(folder)) {
        fs.rmdirSync(path.join(basePath, folder), { recursive: true });
    }
});