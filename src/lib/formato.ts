export function brl(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function fmtData(data: string): string {
  return data.split("-").reverse().join("/");
}
