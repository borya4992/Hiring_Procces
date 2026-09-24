export type Sheet = {
  name: string
  headers: string[]
  rows: Array<Array<string | number>>
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(String(value))}</Data></Cell>`
}

export function downloadExcel(filename: string, sheets: Sheet[]) {
  const worksheets = sheets
    .map((sheet) => {
      const name = xmlEscape(sheet.name.slice(0, 31) || 'Sheet')
      const header = `<Row>${sheet.headers.map((h) => cell(h)).join('')}</Row>`
      const body = sheet.rows.map((row) => `<Row>${row.map((v) => cell(v)).join('')}</Row>`).join('')
      return `<Worksheet ss:Name="${name}"><Table>${header}${body}</Table></Worksheet>`
    })
    .join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`

  const blob = new Blob([`\uFEFF${xml}`], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
