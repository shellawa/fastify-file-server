import { readFileSync } from "node:fs"
import { JSONFileSyncPreset } from "lowdb/node"
import { minimatch } from "minimatch"
import { join } from "node:path/posix"

const defaultData = { fileList: [] }
const db = JSONFileSyncPreset("db.json", defaultData)

export const getFileList = () => {
  db.read()
  return db.data
}

export const isExposed = path => {
  db.read()
  return db.data.fileList.some(x => x.path === path)
}

export const getFile = path => {
  db.read()
  const fileIndex = db.data.fileList.findIndex(x => x.path === path)
  if (fileIndex === -1) return
  const fileInfo = db.data.fileList[fileIndex]

  if (Date.now() < fileInfo.expire) {
    if (fileInfo.remaining > 0) {
      fileInfo.remaining -= 1
    }
    if (fileInfo.remaining == 0) {
      db.data.fileList = db.data.fileList.filter(x => x.path != fileInfo.path)
    }
    db.write()
    return readFileSync(fileInfo.path)
  } else db.data.fileList = db.data.fileList.filter(x => x.path != fileInfo.path)
  db.write()
}

export const changeExposedState = path => {
  db.read()
  path = join(path)
  if (isExposed(path)) {
    db.data.fileList = db.data.fileList.filter(x => x.path != path)
  } else {
    db.data.fileList.push({
      path: path,
      remaining: -1,
      expire: 1000000000000000
    })
  }
  db.write()
}
