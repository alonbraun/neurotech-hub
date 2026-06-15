import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const root = process.cwd()

export function getFiles(dir: string) {
  const fullDir = path.join(root, 'content', dir)
  if (!fs.existsSync(fullDir)) return []
  return fs.readdirSync(fullDir).filter(f => f.endsWith('.md'))
}

export function getFileBySlug(dir: string, slug: string) {
  const fullPath = path.join(root, 'content', dir, `${slug}.md`)
  if (!fs.existsSync(fullPath)) return null
  const raw = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(raw)
  const sanitized = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Date ? v.toISOString().split('T')[0] : v])
  )
  return { ...sanitized, content, slug }
}

export function getAllFiles(dir: string) {
  return getFiles(dir).map(file => {
    const slug = file.replace('.md', '')
    return getFileBySlug(dir, slug)
  }).filter(Boolean).sort((a: any, b: any) => {
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime()
    return 0
  })
}
