export class StreamKeyResponse {
  success!: true;

  static ok(): StreamKeyResponse {
    return { success: true };
  }
}
