/**
 * Save a remote file to the user's device.
 *
 * The obvious `<a download>` does not work here: uploads are served by the API
 * on a different origin from the app, and browsers silently ignore the
 * `download` attribute on cross-origin links — you get a navigation to the
 * image instead of a saved file. Fetching the bytes ourselves and handing over
 * a blob URL is same-origin from the browser's point of view, so the filename
 * is honoured.
 */
export async function downloadUrl(url: string, filename?: string): Promise<void> {
  const name = filename ?? filenameFromUrl(url);
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, name);
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // Last resort: open it in a new tab so the file is at least reachable and
    // can be saved by hand.
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
