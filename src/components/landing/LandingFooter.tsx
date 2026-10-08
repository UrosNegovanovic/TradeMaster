import Link from 'next/link'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { landingShell } from './landing-shell'

const footerLink =
  'inline-flex min-h-11 items-center rounded-md text-[15px] text-neutral-700 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const heading = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-900'

type LandingFooterProps = {
  /** Extra bottom padding so the mobile sticky CTA does not cover links. */
  stickyCtaPad?: boolean
}

export function LandingFooter({ stickyCtaPad = false }: LandingFooterProps) {
  return (
    <footer
      className={`border-t border-neutral-100 pt-10 ${stickyCtaPad ? 'pb-24 sm:pb-10' : 'pb-10'}`}
    >
      <div className={landingShell}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,0.85fr))] lg:items-start lg:gap-12">
          <div className="min-w-0 max-w-sm">
            <TradeMasterWordmark size="sm" href="/" />
            <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">
              Sken, lager, katalog i faktura. Jedan nalog po firmi.
            </p>
          </div>

          <nav aria-labelledby="footer-proizvod">
            <h2 id="footer-proizvod" className={heading}>
              Proizvod
            </h2>
            <ul className="mt-2 flex flex-col">
              <li>
                <Link href="/#cena" className={footerLink}>
                  Cena
                </Link>
              </li>
              <li>
                <Link href="/#pitanja" className={footerLink}>
                  Pitanja
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-nalog">
            <h2 id="footer-nalog" className={heading}>
              Nalog
            </h2>
            <ul className="mt-2 flex flex-col">
              <li>
                <Link href="/sign-in" className={footerLink}>
                  Prijava
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className={footerLink}>
                  Registrujte se
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-pravno">
            <h2 id="footer-pravno" className={heading}>
              Pravno
            </h2>
            <ul className="mt-2 flex flex-col">
              <li>
                <Link href="/privatnost" className={footerLink}>
                  Privatnost
                </Link>
              </li>
              <li>
                <Link href="/uslovi" className={footerLink}>
                  Uslovi
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-neutral-100 pt-5 text-[13px] text-neutral-500">
          © {new Date().getFullYear()} TradeMaster
        </p>
      </div>
    </footer>
  )
}
