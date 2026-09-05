export type CareItem = {
  id: string;
  title: string;
  detail: string;
  os: "win" | "mac" | "both";
};

export const CARE_ITEMS: CareItem[] = [
  {
    id: "storage-sense",
    os: "win",
    title: "打开存储感知",
    detail:
      "Win + I → 系统 → 存储 → 存储感知。打开「自动清理用户内容」，每周跑一次。临时文件交给它。回收站设 30 天再清。下载文件夹选「从不」——里面常有要留的文件。这才是真正的后台自动清理。",
  },
  {
    id: "cleanup-recs",
    os: "win",
    title: "看一遍清理建议",
    detail:
      "设置 → 系统 → 存储 → 清理建议。Windows 会标出下载里的大文件、长期不用的应用、已经同步到 OneDrive 的本地副本。系统垃圾走这里，重复文件再回来用拂尘。",
  },
  {
    id: "recycle",
    os: "both",
    title: "清空回收站",
    detail:
      "桌面回收站图标上右键 → 清空回收站。删过的文件其实还占盘。Mac 打开废纸篓，点「清倒」。不要用 Shift+Delete，删错没法找回。也不要天天清空：频繁写删会磨固态硬盘。",
  },
  {
    id: "temp",
    os: "win",
    title: "清系统临时文件",
    detail: "设置 → 系统 → 存储 → 临时文件。勾选临时文件、Windows 更新清理、缩略图，再删除。不要勾「下载」除非你确认里面没有要留的安装包以外的东西。",
  },
  {
    id: "cleanmgr",
    os: "win",
    title: "跑一次磁盘清理（含系统文件）",
    detail: "开始菜单搜「磁盘清理」，选系统盘，再点「清理系统文件」。重点勾选「Windows 更新清理」和「传递优化文件」。这往往比清用户文件夹腾得更多。",
  },
  {
    id: "onedrive",
    os: "win",
    title: "云盘文件改为仅联机",
    detail:
      "设置 → 系统 → 存储 → 清理建议 → 同步到云端的文件。已经在 OneDrive 里的，可改成「仅联机」，本地只留占位。拂尘不会替你做这一步。",
  },
  {
    id: "startup",
    os: "win",
    title: "关掉多余开机项",
    detail: "Ctrl + Shift + Esc 打开任务管理器 → 启动应用。网盘、游戏平台、输入法助手能关则关。电脑卡，经常是开机项，不是灰尘文件。",
  },
  {
    id: "uninstall",
    os: "both",
    title: "卸载长期不用的软件",
    detail: "设置 → 应用（Windows）或程序坞/启动台里的闲置 App。杀毒套装、多年前的播放器优先。卸载后残留多半在 AppData，体积大再手动清。",
  },
  {
    id: "leftover",
    os: "win",
    title: "看一眼卸载残留",
    detail:
      "资源管理器地址栏输入 %LocalAppData%。Discord / Teams / Adobe / Steam / VS Code 的 Cache、Code Cache、logs、shadercache 可删。不要动 Windows、Installer、Program Files。注册表清洁软件别装。",
  },
  {
    id: "no-defrag",
    os: "win",
    title: "固态硬盘不要做碎片整理",
    detail:
      "设置 → 系统 → 存储 → 高级存储设置 → 驱动器优化。SSD 让 Windows 自己 TRIM。第三方碎片整理、注册表清理、驱动强推软件都不要装。",
  },
  {
    id: "wechat",
    os: "both",
    title: "清理微信缓存与聊天文件",
    detail: "微信 → 设置 → 文件管理 / 存储空间。视频、过期文件、缓存通常能腾出数 GB。",
  },
  {
    id: "browser",
    os: "both",
    title: "清浏览器缓存和下载记录",
    detail: "Chrome / Edge：下载页里删掉安装包；设置里清除缓存图片与文件，书签和密码可保留。缓存清完网站会重新加载，这是正常的。",
  },
  {
    id: "desktop",
    os: "both",
    title: "桌面只留常用入口",
    detail: "安装包、压缩包、截图不要堆在桌面。资源管理器每次都要画图标，桌面一乱整机就钝。",
  },
  {
    id: "mac-storage",
    os: "mac",
    title: "查看 macOS 储存空间",
    detail: "苹果菜单 → 系统设置 → 通用 → 储存空间。按建议清理系统数据、文稿与 iOS 备份。",
  },
  {
    id: "mac-login",
    os: "mac",
    title: "关掉登录项",
    detail: "系统设置 → 通用 → 登录项。网盘、设计软件更新器、会议 App 不必全部随开机启动。",
  },
  {
    id: "sleep",
    os: "both",
    title: "重启一次，再观察",
    detail: "整理完先重启。内存泄漏和更新残留要一次冷启动才会真正松开。",
  },
];

export function detectOs(): "win" | "mac" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua) && !/iPhone|iPad/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "win";
  return "other";
}

const CARE_KEY = "fuchen.care.v1";

export function loadCareDone(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CARE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveCareDone(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CARE_KEY, JSON.stringify(ids));
}
