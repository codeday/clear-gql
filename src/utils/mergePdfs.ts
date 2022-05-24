import fetch from 'node-fetch';
import FormData from 'form-data';
import config from '../config';
import { streamToBuffer } from './streamToBuffer';

export async function mergePdfs(files: Buffer[]): Promise<Buffer> {
  const body = new FormData();
  files.forEach((file, i) => body.append('files', file, { filename: `${i}.pdf` }));
  const res = await fetch(`${config.gotenberg.base}/forms/pdfengines/merge`, { method: 'POST', body });
  return streamToBuffer(res.body);
}
