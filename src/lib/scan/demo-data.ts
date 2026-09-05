import type { RawFile } from "./types";

function days(n: number): number {
  return Date.now() - n * 86_400_000;
}

function idFor(path: string): string {
  return `demo:${path}`;
}

function f(path: string, size: number, agoDays: number): RawFile {
  const name = path.split("/").pop() ?? path;
  return {
    id: idFor(path),
    path,
    name,
    size,
    lastModified: days(agoDays),
  };
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const DEMO_FOLDER = "本机";

export function getDemoFiles(): RawFile[] {
  const files: RawFile[] = [
    f("本机/下载/ChromeSetup.exe", 92 * MB, 420),
    f("本机/下载/ChromeSetup (1).exe", 92 * MB, 380),
    f("本机/下载/ChromeSetup (2).exe", 92 * MB, 210),
    f("本机/下载/WeChatWin.exe", 186 * MB, 260),
    f("本机/下载/WeChatWin (1).exe", 186 * MB, 90),
    f("本机/下载/QQ9.7.23.exe", 248 * MB, 510),
    f("本机/下载/腾讯会议安装.exe", 142 * MB, 300),
    f("本机/下载/ZoomInstaller.exe", 98 * MB, 640),
    f("本机/下载/百度网盘安装.exe", 76 * MB, 800),
    f("本机/下载/迅雷11安装包.exe", 64 * MB, 920),
    f("本机/下载/钉钉Setup.exe", 118 * MB, 410),
    f("本机/下载/WPS_Setup.exe", 210 * MB, 540),
    f("本机/下载/SteamSetup.exe", 2.4 * MB, 700),
    f("本机/下载/EdgeSetup.exe", 88 * MB, 330),

    f("本机/下载/毕业设计_最终.docx", 8.4 * MB, 620),
    f("本机/下载/毕业设计_最终_最终.docx", 8.4 * MB, 610),
    f("本机/下载/毕业设计_真的最终.docx", 8.6 * MB, 600),
    f("本机/文档/毕业设计_最终.docx", 8.4 * MB, 580),
    f("本机/OneDrive/文档/毕业设计_最终.docx", 8.4 * MB, 20),
    f("本机/下载/报销单.xlsx", 420 * 1024, 40),
    f("本机/下载/报销单 (1).xlsx", 420 * 1024, 40),
    f("本机/下载/合同扫描件.pdf", 12 * MB, 200),
    f("本机/下载/合同扫描件 (1).pdf", 12 * MB, 198),

    f("本机/下载/电影/周杰伦演唱会.mp4", 4.6 * GB, 880),
    f("本机/下载/课程回放_未剪辑.mp4", 1.8 * GB, 240),
    f("本机/下载/屏幕录制 2024-02-11.mov", 760 * MB, 570),
    f("本机/下载/Adobe_Photoshop_2023.iso", 3.1 * GB, 900),

    f("本机/下载/资料备份.zip", 540 * MB, 730),
    f("本机/下载/资料备份 (1).zip", 540 * MB, 728),
    f("本机/下载/旧电脑桌面.rar", 1.2 * GB, 1100),
    f("本机/下载/微信文件导出.zip", 860 * MB, 490),
    f("本机/桌面/新建文件夹.zip", 220 * MB, 800),
    f("本机/桌面/未命名.zip", 18 * MB, 650),

    f("本机/下载/Thumbs.db", 12 * MB, 20),
    f("本机/桌面/Thumbs.db", 4 * MB, 12),
    f("本机/下载/desktop.ini", 180, 3),
    f("本机/下载/.DS_Store", 8 * 1024, 15),
    f("本机/下载/setup.tmp", 34 * MB, 8),
    f("本机/下载/install.log", 2.2 * MB, 6),
    f("本机/下载/ChromeSetup.exe.crdownload", 41 * MB, 2),
    f("本机/下载/未完成.xltd", 128 * MB, 70),
    f("本机/下载/cache/webcache.tmp", 86 * MB, 4),
    f("本机/下载/cache/gpu.cache", 54 * MB, 4),
    f("本机/临时文件/update.log", 18 * MB, 1),
    f("本机/临时文件/nseA3F2.tmp", 9 * MB, 1),
    f("本机/临时文件/dump.log", 27 * MB, 11),

    f("本机/AppData/Discord/Cache/data_0", 180 * MB, 3),
    f("本机/AppData/Discord/Code Cache/index", 64 * MB, 3),
    f("本机/AppData/Adobe/Media Cache/cache.dat", 420 * MB, 10),
    f("本机/AppData/Steam/shadercache/1091500.bin", 260 * MB, 8),

    f("本机/微信文件/WeChat Files/Cache/cache_0.dat", 310 * MB, 5),
    f("本机/微信文件/WeChat Files/Cache/cache_1.dat", 280 * MB, 5),
    f("本机/微信文件/WeChat Files/Video/2023-08.mp4", 420 * MB, 720),
    f("本机/微信文件/WeChat Files/Video/2023-08 (1).mp4", 420 * MB, 720),
    f("本机/微信文件/WeChat Files/FileStorage/MsgAttach/old.dat", 190 * MB, 400),

    f("本机/桌面/屏幕截图 2023-08-12 21.04.11.png", 2.8 * MB, 740),
    f("本机/下载/屏幕截图 2023-08-12 21.04.11.png", 2.8 * MB, 740),
    f("本机/桌面/快捷方式.url", 320, 100),
    f("本机/桌面/新建文本文档.txt", 0, 900),
    f("本机/桌面/安装说明.txt", 12 * 1024, 500),
  ];

  const photoNames = [
    "IMG_1042.JPG",
    "IMG_1048.JPG",
    "IMG_1101.HEIC",
    "IMG_1188.JPG",
    "IMG_1204.JPG",
    "IMG_1311.JPG",
    "DSC_0088.JPG",
    "微信图片_20231102.jpg",
  ];
  photoNames.forEach((name, i) => {
    const size = (3.2 + i * 0.35) * MB;
    const ago = 400 + i * 18;
    files.push(f(`本机/下载/相机胶卷/${name}`, size, ago));
    files.push(f(`本机/下载/相机胶卷/${name.replace(".", " (1).")}`, size, ago - 1));
    if (i % 2 === 0) {
      files.push(f(`本机/图片/${name}`, size, ago - 2));
    }
  });

  for (let i = 1; i <= 18; i++) {
    const n = String(i).padStart(2, "0");
    files.push(
      f(
        `本机/下载/屏幕截图/屏幕截图 2024-01-${n}.png`,
        (1.1 + (i % 5) * 0.4) * MB,
        580 - i * 3,
      ),
    );
  }

  for (let i = 1; i <= 10; i++) {
    files.push(f(`本机/下载/旧安装包/patch_${i}.tmp`, (2 + i) * MB, 200 + i));
  }

  files.push(f("本机/文档/工作/年度总结.pdf", 6 * MB, 30));
  files.push(f("本机/文档/工作/会议纪要.docx", 240 * 1024, 12));
  files.push(f("本机/图片/头像.png", 180 * 1024, 50));
  files.push(f("本机/下载/简历_张三.pdf", 1.1 * MB, 140));
  files.push(f("本机/下载/简历_张三 (1).pdf", 1.1 * MB, 138));

  return files;
}

export const DEMO_WALK_PATHS = [
  "本机/下载/ChromeSetup.exe",
  "本机/下载/WeChatWin.exe",
  "本机/下载/毕业设计_最终_最终.docx",
  "本机/下载/相机胶卷/IMG_1042.JPG",
  "本机/下载/相机胶卷/IMG_1042 (1).JPG",
  "本机/微信文件/WeChat Files/Cache/cache_0.dat",
  "本机/AppData/Discord/Cache/data_0",
  "本机/OneDrive/文档/毕业设计_最终.docx",
  "本机/下载/Adobe_Photoshop_2023.iso",
  "本机/下载/电影/周杰伦演唱会.mp4",
  "本机/桌面/未命名.zip",
  "本机/临时文件/nseA3F2.tmp",
  "本机/下载/资料备份.zip",
  "本机/下载/资料备份 (1).zip",
];
