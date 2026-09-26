export class CameraTimeoutError extends Error {
  constructor() {
    super('Camera access timed out')
    this.name = 'CameraTimeoutError'
  }
}

export async function getCamerasWithTimeout<T>(
  getCameras: () => Promise<T>,
  timeoutMs = 7_000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      getCameras(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new CameraTimeoutError()), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

type CameraErrorLike = { name?: string; message?: string }

export function cameraAccessMessage(error: CameraErrorLike): string {
  if (error.name === 'CameraTimeoutError') {
    return 'Kamera se ne pokreće. Proverite dozvole ili unesite barkod ručno.'
  }
  if (error.name === 'NotAllowedError' || error.message?.toLowerCase().includes('permission')) {
    return 'Nema dozvole za kameru. Dozvolite pristup u pregledaču ili unesite barkod ručno.'
  }
  if (error.name === 'NotFoundError' || error.message?.toLowerCase().includes('no cameras')) {
    return 'Kamera nije pronađena na ovom uređaju. Unesite barkod ručno.'
  }
  return `Kamera nije dostupna: ${error.message || 'nepoznata greška'}. Unesite barkod ručno.`
}
