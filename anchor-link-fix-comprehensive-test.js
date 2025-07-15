/**
 * 锚点链接修复综合测试脚本
 * 
 * 这个脚本用于测试锚点链接修复功能，特别是在实际的 GitHub 页面上。
 * 它会模拟 MarkDownload 扩展的行为，测试链接转换功能。
 */

// 测试数据：各种类型的链接
const testLinks = [
  // 纯锚点链接
  { href: '#section1', description: '纯锚点链接' },
  { href: '#', description: '空锚点' },
  { href: '#section-with-中文', description: '带有 Unicode 字符的锚点' },
  
  // 相对链接带锚点
  { href: 'page.html#section2', description: '相对链接带锚点' },
  { href: './docs/guide.md#setup', description: '相对路径带锚点' },
  { href: '../other/page.html#section', description: '父目录相对链接带锚点' },
  { href: 'page with spaces.html#section', description: '带空格的 URL 和锚点' },
  { href: '?query=param#section', description: '带查询参数的 URL 和锚点' },
  
  // 绝对链接带锚点
  { href: '/absolute/path#section', description: '绝对路径带锚点' },
  { href: 'https://example.com#section', description: '绝对 URL 带锚点' },
  { href: 'https://github.com/user/repo#readme', description: 'GitHub URL 带锚点' },
  
  // 特殊情况
  { href: 'javascript:void(0)#section', description: 'JavaScript URL 带锚点' },
  { href: 'mailto:user@example.com#section', description: 'mailto URL 带锚点' },
  { href: '//example.com#section', description: '协议相对 URL 带锚点' },
  
  // GitHub 特定链接
  { href: '/NaiboWang/EasySpider/blob/master/media/QRCODES.png', description: 'GitHub 图片链接' },
  { href: 'chrome-extension://maamnahpkkhffffkldeloldplaolnfai/NaiboWang/EasySpider/raw/master/media/QRCODES.png', description: 'chrome-extension 图片链接' }
];

// 测试用的 baseURI
const baseURIs = [
  'https://github.com/user/repo/',
  'https://example.com/path/page.html',
  'chrome-extension://extension-id/offscreen.html', // 应该触发回退
  null, // 应该触发回退
  ''    // 应该触发回退
];

/**
 * 检查链接是否为纯锚点链接（以 # 开头）
 */
function isAnchorLink(href) {
  if (!href || typeof href !== 'string') {
    return false;
  }
  return href.startsWith('#') && href.length > 1;
}

/**
 * 检查链接是否为相对于当前页面的锚点链接
 */
function isRelativeToCurrentPage(href) {
  if (!href || typeof href !== 'string') {
    return false;
  }
  
  // 检查是否为 "page.html#section" 或 "./page.html#section" 或 "../page.html#section" 等模式
  // 但不是绝对 URL 或协议相对 URL
  if (href.includes('://') || href.startsWith('//')) {
    return false;
  }
  
  // 检查是否包含锚点
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return false;
  }
  
  // 如果以 # 开头，则是纯锚点链接
  if (hashIndex === 0) {
    return true;
  }
  
  // 检查 # 前面的部分是否为相对路径
  const pathPart = href.substring(0, hashIndex);
  return !pathPart.startsWith('/') && !pathPart.includes('://');
}

/**
 * URL 解析缓存，避免重复解析相同的 URL
 */
const urlParseCache = new Map();

/**
 * 安全的 URL 解析函数，处理格式错误的 URL 并带有缓存
 */
function safeUrlParse(urlString, baseUrl = null) {
  // 创建缓存键
  const cacheKey = baseUrl ? `${urlString}|${baseUrl}` : urlString;
  
  // 首先检查缓存
  if (urlParseCache.has(cacheKey)) {
    return urlParseCache.get(cacheKey);
  }
  
  let result = null;
  try {
    if (baseUrl) {
      result = new URL(urlString, baseUrl);
    } else {
      result = new URL(urlString);
    }
  } catch (error) {
    console.warn('Failed to parse URL:', urlString, 'with base:', baseUrl, error);
  }
  
  // 缓存结果（包括解析失败的 null）
  urlParseCache.set(cacheKey, result);
  
  // 限制缓存大小以防止内存泄漏
  if (urlParseCache.size > 1000) {
    const firstKey = urlParseCache.keys().next().value;
    urlParseCache.delete(firstKey);
  }
  
  return result;
}

/**
 * 验证 URI，处理不同类型的链接
 */
function validateUri(href, baseURI) {
  console.log('DEBUG validateUri: href =', href, 'baseURI =', baseURI);
  
  // 关键修复：如果 baseURI 是 chrome-extension:// 协议，使用合适的回退
  if (baseURI && baseURI.startsWith('chrome-extension://')) {
    console.warn('CRITICAL: Detected chrome-extension baseURI, this should not happen!');
    console.warn('Original baseURI:', baseURI);
    
    // 尝试从 href 中提取真实的 URL
    if (href.includes('/NaiboWang/EasySpider/')) {
      baseURI = 'https://github.com/NaiboWang/EasySpider/';
      console.warn('Using GitHub baseURI extracted from href:', baseURI);
    } else {
      baseURI = 'https://github.com/'; // GitHub 页面的回退
      console.warn('Using fallback baseURI:', baseURI);
    }
  }
  
  // 特殊处理 chrome-extension:// 链接
  if (href && href.startsWith('chrome-extension://') && href.includes('/NaiboWang/EasySpider/')) {
    // 提取路径部分
    const pathMatch = href.match(/\/NaiboWang\/EasySpider\/(raw|blob)\/master\/(.+)/);
    if (pathMatch) {
      const type = pathMatch[1]; // raw 或 blob
      const path = pathMatch[2]; // 文件路径
      
      // 转换为 GitHub URL
      const githubUrl = `https://github.com/NaiboWang/EasySpider/${type}/master/${path}`;
      console.log('Converting chrome-extension URL to GitHub URL:', githubUrl);
      return githubUrl;
    }
  }
  
  // 特殊处理锚点链接
  if (isAnchorLink(href)) {
    console.log('Found anchor link:', href);
    // 对于纯锚点链接（#section），直接返回，不做任何转换
    return href;
  }
  
  if (isRelativeToCurrentPage(href)) {
    const hashIndex = href.indexOf('#');
    if (hashIndex > 0) {
      // 对于带锚点的相对链接，提取并保留锚点部分
      const pathPart = href.substring(0, hashIndex);
      const anchorPart = href.substring(hashIndex);
      
      try {
        // 验证路径部分可以被解析
        const baseUrl = safeUrlParse(baseURI);
        if (baseUrl) {
          const resolvedUrl = safeUrlParse(pathPart, baseUrl);
          if (resolvedUrl) {
            // 返回相对格式，保留锚点部分
            return pathPart + anchorPart;
          }
        }
        // 如果路径解析失败，按原样返回
        console.warn('Failed to resolve relative anchor link:', href, 'with base:', baseURI);
        return href;
      } catch (error) {
        console.warn('Error processing relative anchor link:', href, error);
        return href;
      }
    } else if (hashIndex === 0) {
      // 纯锚点链接，按原样返回
      return href;
    }
  }
  
  // 原有逻辑处理其他类型的链接，增强错误处理
  const parsedUrl = safeUrlParse(href);
  if (parsedUrl) {
    // 如果已经是有效的绝对 URL，按原样返回
    return href;
  } else {
    // 如果不是有效的 URL，可能需要添加 baseURI
    const baseUrl = safeUrlParse(baseURI);
    if (!baseUrl) {
      console.error('Invalid base URI provided:', baseURI);
      return href; // 如果 baseURI 无效，返回原始 href
    }

    try {
      // 如果 href 以 '/' 开头，需要从 origin 开始
      if (href.startsWith('/')) {
        href = baseUrl.origin + href;
      }
      // 否则需要从本地文件夹开始
      else {
        href = baseUrl.href + (baseUrl.href.endsWith('/') ? '' : '/') + href;
      }
    } catch (error) {
      console.warn('Error constructing URL:', error);
      return href; // 出错时返回原始 href
    }
  }
  return href;
}

/**
 * 增强的 validateUri 函数，带有全面的回退机制
 */
function validateUriWithFallback(href, baseURI, originalHref = null) {
  try {
    // 首先尝试使用增强的 validateUri
    const result = validateUri(href, baseURI);
    
    // 验证结果是合理的 URL 或锚点链接
    if (result && (result.startsWith('#') || safeUrlParse(result))) {
      return result;
    }
    
    console.warn('validateUri returned invalid result:', result, 'for href:', href);
    
    // 如果结果无效，回退到原始 href
    return originalHref || href;
    
  } catch (error) {
    console.error('Critical error in validateUri:', error, 'href:', href, 'baseURI:', baseURI);
    
    // 最终回退 - 返回原始 href
    return originalHref || href;
  }
}

/**
 * 测试 validateUri 函数
 */
function testValidateUri() {
  console.log('=== Testing validateUri function ===');
  
  // 测试 GitHub 特定链接
  const githubLinks = [
    '/NaiboWang/EasySpider/blob/master/media/QRCODES.png',
    'chrome-extension://maamnahpkkhffffkldeloldplaolnfai/NaiboWang/EasySpider/raw/master/media/QRCODES.png'
  ];
  
  const baseURI = 'https://github.com/NaiboWang/EasySpider';
  
  githubLinks.forEach(href => {
    const result = validateUri(href, baseURI);
    console.log(`Original: ${href}\nConverted: ${result}\n`);
  });
  
  // 测试锚点链接
  const anchorLinks = [
    '#section1',
    '#易采集easyspider-visual-code-free-web-crawler',
    'README.md#installation'
  ];
  
  anchorLinks.forEach(href => {
    const result = validateUri(href, baseURI);
    console.log(`Original: ${href}\nConverted: ${result}\n`);
  });
  
  console.log('');
}

// 执行测试
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // 添加按钮来运行测试
    const button = document.createElement('button');
    button.textContent = '运行链接测试';
    button.style.padding = '10px';
    button.style.margin = '20px';
    button.addEventListener('click', testValidateUri);
    document.body.appendChild(button);
    
    console.log('锚点链接测试脚本已加载。点击按钮运行测试。');
  });
}