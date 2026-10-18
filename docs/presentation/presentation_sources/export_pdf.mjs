import fs from 'node:fs/promises';
import path from 'node:path';
import nodeProcess from 'node:process';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const root = nodeProcess.cwd();
const input = path.join(root, 'docs', 'presentation', 'SkillBridge_Project_Showcase.pptx');
const output = path.join(root, 'docs', 'presentation', 'SkillBridge_Project_Showcase.pdf');

const deck = await PresentationFile.importPptx(await FileBlob.load(input));
const pdf = await deck.export({ format: 'pdf' });
await fs.writeFile(output, new Uint8Array(await pdf.arrayBuffer()));
console.log(output);
