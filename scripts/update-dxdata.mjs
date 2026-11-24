#!/usr/bin/env node
/**
 * 生成 data/dxdata-index.js —— dxrating.html 用的谱面 ID 表。
 *
 * 数据源是 gekichumai/dxrating 的 packages/dxdata/dxdata.json，
 * 投影成只保留「曲名 / 谱面类型 / musicId / 版本 / 定数」的紧凑索引：
 *
 *   {
 *     generatedAt, appVersion, appVersionId, versions, idOverrides,
 *     songs: [ [songId, [ [type, musicId|null, [版本索引×5], [定数×10 ×5] ], ... ] ], ... ]
 *   }
 *
 * 页面通过 <script src="data/dxdata-index.js"> 加载，不再把 100+ KB 数据内嵌进 HTML。
 *
 * 用法：
 *   node scripts/update-dxdata.mjs                          # 从 GitHub 下载最新数据
 *   node scripts/update-dxdata.mjs --dxdata <file> --id-map <file>
 *   node scripts/update-dxdata.mjs --out <file>             # 指定产物路径（默认 data/dxdata-index.js）
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const DEFAULT_OUT = resolve(ROOT, 'data/dxdata-index.js')

const RAW_DXDATA = 'https://raw.githubusercontent.com/gekichumai/dxrating/main/packages/dxdata/dxdata.json'
const RAW_ID_MAP = 'https://raw.githubusercontent.com/gekichumai/dxrating/main/apps/web/src/assets/music-id-map.json'

const DIFFICULTIES = ['basic', 'advanced', 'expert', 'master', 'remaster']
const UTAGE_TYPES = new Set(['utage', 'utage2p'])
const SKIPPED_MAP_VERSION = '24000'
const MIN_EXPECTED_SHEETS = 1000

const parseArgs = (argv) => {
  const opts = {
    dxdata: null,
    idMap: null,
    out: DEFAULT_OUT,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const value = argv[++i]
      if (value === undefined) throw new Error(`参数 ${arg} 缺少值`)
      return value
    }
    if (arg === '--dxdata') opts.dxdata = next()
    else if (arg === '--id-map') opts.idMap = next()
    else if (arg === '-o' || arg === '--out') opts.out = next()
    else if (arg === '-h' || arg === '--help') {
      console.log('用法: node scripts/update-dxdata.mjs [--dxdata <file>] [--id-map <file>] [-o <file>]')
      process.exit(0)
    } else {
      throw new Error(`未知参数: ${arg}`)
    }
  }
  if ((opts.dxdata === null) !== (opts.idMap === null)) {
    throw new Error('--dxdata 与 --id-map 必须同时指定（或都不指定，从 GitHub 下载）')
  }
  return opts
}

const fetchJson = async (url, label, attempts = 3) => {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'MaiData2Aqua-dxdata-updater' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
      return await response.json()
    } catch (error) {
      lastError = error
      console.warn(`[warn] 下载 ${label} 失败（第 ${attempt}/${attempts} 次）：${error.message}`)
      if (attempt < attempts) await new Promise((done) => setTimeout(done, attempt * 2000))
    }
  }
  throw new Error(`下载 ${label} 失败：${lastError.message}`)
}

/**
 * music-id-map 中有 95 条 ID 的 ver === '24000'，dxrating 的导入端
 * （import-normalizers.ts:shouldSkipProviderMusicId）会直接丢弃它们。
 * 对这类 ID，若表里还有同一首歌的其它 ID，就用它替换，规则与 CLI 的
 * --id-space internal 兜底完全一致（含「能否解析回同一谱面」自检）。
 */
const buildIdOverrides = (dxdata, idMap) => {
  const inferType = (id) => (id >= 10000 ? 'dx' : 'std')
  const sheetIdOf = (songId, type, difficulty) => [songId, type, difficulty].join('__dxrt__')

  const byId = new Map()
  const byTitle = new Map()
  const byInternalId = new Map()

  for (const song of dxdata.songs) {
    for (const sheet of song.sheets) {
      const id = sheetIdOf(song.songId, sheet.type, sheet.difficulty)
      byId.set(id, { songId: song.songId, title: song.title, type: sheet.type, difficulty: sheet.difficulty })
      const titleKey = `${song.title}\u0000${sheet.type}\u0000${sheet.difficulty}`
      if (!byTitle.has(titleKey)) byTitle.set(titleKey, id)
      if (sheet.internalId !== undefined) {
        byInternalId.set(`${sheet.internalId}\u0000${sheet.type}\u0000${sheet.difficulty}`, id)
      }
    }
  }

  // 复刻 song-catalog.ts:resolveReference({ kind: 'provider-music-id' })
  const resolveProvider = (musicId, difficulty) => {
    const numericId = Number.isInteger(Number(musicId)) ? Number(musicId) : null
    const type = numericId === null ? null : inferType(numericId)
    if (numericId !== null) {
      const id = byInternalId.get(`${numericId}\u0000${type}\u0000${difficulty}`)
      if (id) return id
    }
    const mapped = idMap[String(musicId)]
    if (!mapped) return null
    return byId.has(sheetIdOf(mapped.name, type, difficulty))
      ? sheetIdOf(mapped.name, type, difficulty)
      : (byTitle.get(`${mapped.name}\u0000${type}\u0000${difficulty}`) ?? null)
  }

  const byName = new Map()
  for (const [key, value] of Object.entries(idMap)) {
    const id = Number(key)
    if (!Number.isInteger(id)) continue
    const list = byName.get(value.name) ?? []
    list.push({ id, ver: value.ver })
    byName.set(value.name, list)
  }

  const overrides = {}
  for (const song of dxdata.songs) {
    for (const sheet of song.sheets) {
      if (UTAGE_TYPES.has(sheet.type) || sheet.internalId === undefined) continue
      let musicId = sheet.internalId
      if (sheet.type === 'dx' && musicId < 10000) musicId += 10000
      if (idMap[String(musicId)]?.ver !== SKIPPED_MAP_VERSION) continue
      if (overrides[musicId] !== undefined) continue

      const names = new Set([song.title, song.songId, `${song.title} [DX]`, `${song.title}[DX]`])
      const candidates = []
      for (const name of names) {
        for (const candidate of byName.get(name) ?? []) {
          if (inferType(candidate.id) !== sheet.type) continue
          if (candidate.ver === SKIPPED_MAP_VERSION) continue
          const sheetId = sheetIdOf(song.songId, sheet.type, sheet.difficulty)
          if (resolveProvider(candidate.id, sheet.difficulty) !== sheetId) continue
          if (!candidates.includes(candidate.id)) candidates.push(candidate.id)
        }
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a - b)
        overrides[musicId] = candidates[0]
        console.log(`[id-override] ${musicId} -> ${candidates[0]}  (${song.title} / ${sheet.type})`)
      }
    }
  }

  return overrides
}

const buildIndex = (dxdata, idMap) => {
  if (!Array.isArray(dxdata.songs) || dxdata.songs.length === 0) {
    throw new Error('dxdata.songs 为空，拒绝写入')
  }
  if (!Array.isArray(dxdata.versions) || dxdata.versions.length === 0) {
    throw new Error('dxdata.versions 为空，拒绝写入')
  }

  const idOverrides = buildIdOverrides(dxdata, idMap)

  const versions = dxdata.versions.map((item) => item.version)
  const appVersion = versions.at(-1)
  const appVersionId = versions.length - 1

  const songs = []
  let sheetCount = 0
  let ratedSheetCount = 0
  const duplicates = new Map()

  for (const song of dxdata.songs) {
    const buckets = new Map()

    for (const sheet of song.sheets) {
      if (UTAGE_TYPES.has(sheet.type)) continue
      const difficultyIndex = DIFFICULTIES.indexOf(sheet.difficulty)
      if (difficultyIndex < 0) continue

      let bucket = buckets.get(sheet.type)
      if (!bucket) {
        bucket = {
          type: sheet.type,
          musicId: null,
          versionIdx: [null, null, null, null, null],
          levels: [null, null, null, null, null],
        }
        buckets.set(sheet.type, bucket)
      }

      bucket.versionIdx[difficultyIndex] = versions.indexOf(sheet.version)

      // 定数：优先使用当前版本的 multiver 值（与 song-catalog.ts:projectSong 一致），存成 ×10 的整数
      const levelValue = sheet.multiverInternalLevelValue?.[appVersion] ?? sheet.internalLevelValue
      if (typeof levelValue === 'number' && Number.isFinite(levelValue)) {
        bucket.levels[difficultyIndex] = Math.round(levelValue * 10)
        ratedSheetCount++
      }

      if (sheet.internalId !== undefined) {
        let musicId = sheet.internalId
        // 极少数「后补 DX 谱」沿用 STD 的 ID，正向解析按 >=10000 判类型，这里必须抬到 DX 区间
        if (sheet.type === 'dx' && musicId < 10000) musicId += 10000
        bucket.musicId = musicId

        const key = `${musicId}`
        if (duplicates.has(key)) {
          const previous = duplicates.get(key)
          if (previous !== song.songId) {
            console.warn(`[warn] musicId ${musicId} 同时属于 ${previous} 与 ${song.songId}`)
          }
        } else {
          duplicates.set(key, song.songId)
        }
      }

      sheetCount++
    }

    if (buckets.size === 0) continue
    songs.push([song.songId, [...buckets.values()].map((b) => [b.type, b.musicId, b.versionIdx, b.levels])])
  }

  if (sheetCount < MIN_EXPECTED_SHEETS) {
    throw new Error(`只解析到 ${sheetCount} 个谱面（预期至少 ${MIN_EXPECTED_SHEETS}），拒绝写入`)
  }

  return {
    indexData: {
      generatedAt: dxdata.updateTime
        ? new Date(dxdata.updateTime).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      appVersion,
      appVersionId,
      versions,
      idOverrides,
      songs,
    },
    stats: { sheetCount, ratedSheetCount },
  }
}

const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

const readExistingIndex = (path) => {
  try {
    const text = readFileSync(path, 'utf8')
    const match = text.match(/globalThis\.DXDATA_INDEX = ([\s\S]*);\s*$/)
    return match ? JSON.parse(match[1]) : null
  } catch {
    return null
  }
}

/** 忽略 generatedAt（每天都会变），只比较真正影响页面结果的数据 */
const fingerprint = (indexData) =>
  JSON.stringify([
    indexData.appVersion,
    indexData.appVersionId,
    indexData.versions,
    indexData.idOverrides,
    indexData.songs,
  ])

const main = async () => {
  const opts = parseArgs(process.argv.slice(2))

  const dxdata = opts.dxdata
    ? JSON.parse(readFileSync(opts.dxdata, 'utf8'))
    : await fetchJson(RAW_DXDATA, 'dxdata.json')
  const idMap = opts.idMap
    ? JSON.parse(readFileSync(opts.idMap, 'utf8'))
    : await fetchJson(RAW_ID_MAP, 'music-id-map.json')

  const { indexData, stats } = buildIndex(dxdata, idMap)

  const existing = readExistingIndex(opts.out)
  if (existing && fingerprint(existing) === fingerprint(indexData)) {
    console.log(`谱面数据无变化，跳过写入: ${resolve(opts.out)}`)
    return
  }

  const source = opts.dxdata ? resolve(opts.dxdata) : RAW_DXDATA
  const output =
    `/* 由 scripts/update-dxdata.mjs 生成，请勿手动修改。\n` +
    ` * 数据源: gekichumai/dxrating packages/dxdata/dxdata.json\n` +
    ` * 上游 updateTime: ${dxdata.updateTime ?? 'unknown'}\n` +
    ` */\n` +
    `globalThis.DXDATA_INDEX = ${safeJson(indexData)};\n`

  mkdirSync(dirname(opts.out), { recursive: true })
  writeFileSync(opts.out, output)

  console.log(`数据源: ${source}`)
  console.log(`歌曲: ${indexData.songs.length}`)
  console.log(`谱面: ${stats.sheetCount}（其中 ${stats.ratedSheetCount} 条带定数）`)
  console.log(`ID 覆盖表: ${Object.keys(indexData.idOverrides).length} 条 ${JSON.stringify(indexData.idOverrides)}`)
  console.log(`游戏版本: ${indexData.appVersion}（${indexData.generatedAt}）`)
  console.log(`产物: ${resolve(opts.out)} (${(Buffer.byteLength(output) / 1024).toFixed(0)} KB)`)
}

main().catch((error) => {
  console.error(`[error] ${error.message}`)
  process.exitCode = 1
})
