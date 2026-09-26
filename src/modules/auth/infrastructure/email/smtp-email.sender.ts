import { Injectable } from '@nestjs/common';
import { Socket, createConnection } from 'node:net';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { EmailMessage, EmailSender } from '../../domain/ports/email-sender';

@Injectable()
export class SmtpEmailSender implements EmailSender {
  constructor(private readonly secrets: IAdapterSecret) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.secrets.EMAIL_DELIVERY_ENABLED) {
      return;
    }

    const socket = createConnection({
      host: this.secrets.SMTP_HOST,
      port: this.secrets.SMTP_PORT,
    });

    try {
      await this.read(socket, 220);
      await this.command(socket, `HELO ${this.secrets.APP_NAME}`, 250);
      await this.command(socket, `MAIL FROM:<${this.secrets.MAIL_FROM}>`, 250);
      await this.command(socket, `RCPT TO:<${message.to}>`, [250, 251]);
      await this.command(socket, 'DATA', 354);
      await this.command(socket, this.formatMessage(message), 250);
      await this.command(socket, 'QUIT', 221);
    } finally {
      socket.end();
    }
  }

  private formatMessage(message: EmailMessage): string {
    return [
      `From: ${this.secrets.MAIL_FROM}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.text,
      '.',
    ].join('\r\n');
  }

  private command(
    socket: Socket,
    command: string,
    expected: number | number[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.write(`${command}\r\n`, (error) => {
        if (error) {
          reject(error);
          return;
        }

        this.read(socket, expected).then(() => resolve(), reject);
      });
    });
  }

  private read(socket: Socket, expected: number | number[]): Promise<string> {
    const expectedCodes = Array.isArray(expected) ? expected : [expected];

    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        cleanup();
        const response = chunk.toString('utf8');
        const code = Number(response.slice(0, 3));

        if (!expectedCodes.includes(code)) {
          reject(new Error(`SMTP command failed: ${response.trim()}`));
          return;
        }

        resolve(response);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off('data', onData);
        socket.off('error', onError);
      };

      socket.once('data', onData);
      socket.once('error', onError);
    });
  }
}
