declare module "mammoth/mammoth.browser" {
  export type MammothResult = {
    value: string;
    messages?: any[];
  };

  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<MammothResult>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };

  export default mammoth;
}
