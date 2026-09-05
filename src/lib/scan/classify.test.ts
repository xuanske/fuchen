import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze, keepPreferred } from "./analyze.ts";
import { SKIP_DIR, classifyFlags, extOf, isCloudPath, isDownloadsPath, kindOf } from "./classify.ts";

describe("拂尘分类", () => {
  it("跳过系统目录，识别云盘和下载路径", () => {
    assert.equal(SKIP_DIR.has("windows.old"), true);
    assert.equal(SKIP_DIR.has("$recycle.bin"), true);
    assert.equal(SKIP_DIR.has("program files"), true);
    assert.equal(isCloudPath("本机/OneDrive/文档/a.docx"), true);
    assert.equal(isDownloadsPath("本机/下载/a.exe"), true);
    assert.equal(isCloudPath("本机/文档/a.docx"), false);
  });

  it("Discord / Steam / Adobe 残留标成尘余，下载超过 90 天标陈旧", () => {
    const now = Date.now();
    const leftover = {
      id: "1",
      path: "本机/AppData/Discord/Cache/data_0",
      name: "data_0",
      size: 10,
      lastModified: now,
    };
    const ext = extOf(leftover.name);
    const flags = classifyFlags(leftover, ext, kindOf(leftover.name, ext), now);
    assert.ok(flags.includes("junk"));

    const oldDl = {
      id: "2",
      path: "本机/下载/old.pdf",
      name: "old.pdf",
      size: 12,
      lastModified: now - 100 * 86_400_000,
    };
    const flags2 = classifyFlags(oldDl, "pdf", "document", now);
    assert.ok(flags2.includes("stale"));
    assert.ok(flags2.includes("cloud") === false);
  });

  it("重复时留下原名、不在下载里的那份", () => {
    const keep = {
      id: "a",
      path: "本机/文档/毕业设计_最终.docx",
      name: "毕业设计_最终.docx",
      size: 8,
      lastModified: 1,
      ext: "docx",
      kind: "document" as const,
      flags: [],
    };
    const copy = {
      ...keep,
      id: "b",
      path: "本机/下载/毕业设计_最终 (1).docx",
      name: "毕业设计_最终 (1).docx",
    };
    assert.equal(keepPreferred(keep, copy).id, "a");
  });

  it("分析报告带出清理建议", async () => {
    const report = await analyze({
      source: "demo",
      folderName: "本机",
      files: [
        { id: "1", path: "本机/下载/a.exe", name: "Setup.exe", size: 90, lastModified: Date.now() - 20 * 86_400_000 },
        { id: "2", path: "本机/下载/a (1).exe", name: "Setup (1).exe", size: 90, lastModified: Date.now() - 18 * 86_400_000 },
        { id: "3", path: "本机/AppData/Discord/Cache/x", name: "x.tmp", size: 40, lastModified: Date.now() },
      ],
    });
    assert.ok(report.recommendations.length >= 1);
    assert.ok(report.suggestedIds.includes("2") || report.suggestedIds.includes("1"));
    assert.ok(report.junk.some((f) => f.id === "3"));
  });
});
