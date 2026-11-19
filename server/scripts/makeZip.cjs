// makeZip.cjs — builds bizdwaar-deploy.zip with proper forward-slash paths
const { ZipArchive } = require('archiver')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../../')
const output = path.join(root, 'bizdwaar-deploy.zip')

if (fs.existsSync(output)) fs.unlinkSync(output)

const archive = new ZipArchive({ zlib: { level: 6 } })
const stream = fs.createWriteStream(output)

const exclude = new Set(['.git', 'node_modules', '.env', 'bizdwaar-deploy.zip', 'server/scripts/makeZip.cjs', 'deploy.ps1'])

archive.pipe(stream)

// Add all tracked project files except excluded
function addDir(dir, zipBase) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const rel = path.relative(root, full).replace(/\\/g, '/')
    // Skip excluded top-level names
    const topLevel = rel.split('/')[0]
    if (exclude.has(topLevel)) continue
    if (entry === '.env') continue

    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      addDir(full, zipBase)
    } else {
      archive.file(full, { name: rel })
    }
  }
}

addDir(root, '')

archive.finalize()

stream.on('close', () => {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(2)
  console.log(`Created bizdwaar-deploy.zip — ${mb} MB`)
})
archive.on('error', err => { throw err })
