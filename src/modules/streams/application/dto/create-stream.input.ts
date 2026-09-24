export interface CreateStreamInput {
  userId: string;
  title: string;
  description?: string;
}

export interface CreateStreamPayload {
  title: string;
  description?: string;
}

export interface CreateStreamOutput {
  streamId: string;
  status: 'created';
}
