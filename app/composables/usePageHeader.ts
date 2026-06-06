export function usePageHeader(title?: string, sub?: string) {
  const header = useState<{ title: string; sub: string }>('page-header', () => ({ title: '', sub: '' }))
  if (title !== undefined) header.value = { title, sub: sub ?? '' }
  return header
}
