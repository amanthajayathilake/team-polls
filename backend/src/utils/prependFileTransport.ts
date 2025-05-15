import fs from 'fs';
import path from 'path';
import Transport from 'winston-transport';

export class PrependFileTransport extends Transport {
  private filename: string;

  constructor(options: any) {
    super(options);
    this.filename = options.filename;

    // Create the file if it doesn't exist
    if (!fs.existsSync(this.filename)) {
      const dirname = path.dirname(this.filename);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(this.filename, '');
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Format the log entry
    const logEntry = `${info[Symbol.for('message')]}\n`;

    try {
      // Read the current content
      const currentContent = fs.readFileSync(this.filename, 'utf8');

      // Prepend the new log entry
      fs.writeFileSync(this.filename, logEntry + currentContent);

      callback();
    } catch (err) {
      callback();
    }
  }
}
