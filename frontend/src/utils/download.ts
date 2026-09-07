export async function downloadUrl(url: string, filename?: string): Promise<void> {
  const name = filename ?? filenameFromUrl(url);
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, name);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function triggerDownload(href: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function filenameFromUrl(url: string): string {
  try {
    const last = new URL(url, window.location.origin).pathname.split('/').pop();
    return last && last.includes('.') ? decodeURIComponent(last) : 'duka-download';
  } catch {
    return 'duka-download';
  }
}
