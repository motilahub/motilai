import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  type AttachmentAdapter,
  type CompleteAttachment,
  type PendingAttachment,
} from "@assistant-ui/react";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

class PdfAttachmentAdapter implements AttachmentAdapter {
  accept = "application/pdf,.pdf";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    if (file.size > MAX_PDF_SIZE) {
      throw new Error("PDF 文件不能超过 10 MB");
    }

    return {
      id: crypto.randomUUID(),
      type: "document",
      name: file.name,
      contentType: "application/pdf",
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          data: await fileToDataUrl(attachment.file),
          mimeType: "application/pdf",
          filename: attachment.name,
        },
      ],
    };
  }

  async remove() {
    // Attachments are held in browser memory until the message is sent.
  }
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const createAttachmentAdapter = () =>
  new CompositeAttachmentAdapter([
    new SimpleImageAttachmentAdapter(),
    new SimpleTextAttachmentAdapter(),
    new PdfAttachmentAdapter(),
  ]);
