import Image from 'next/image'
import Link from 'next/link'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { operator } from '@/lib/operator'
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
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="min-w-0 lg:col-span-3">
            <TradeMasterWordmark size="sm" href="/" />
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-neutral-600">
              Sken, lager, katalog i faktura. Jedan nalog po firmi.
            </p>
          </div>

          <div className="min-w-0 lg:col-span-3" aria-labelledby="footer-firma">
            <h2 id="footer-firma" className={heading}>
              Firma
            </h2>
            <p className="mt-2 text-[15px] font-semibold text-neutral-900">{operator.name}</p>
            <Image
              src={operator.logoSrc}
              alt={operator.name}
              width={operator.logoWidth}
              height={operator.logoHeight}
              className="mt-2 h-14 w-auto max-w-full object-contain object-left"
            />
            <ul className="mt-3 text-[14px] leading-snug text-neutral-600">
              <li className="py-1">PIB {operator.pib}</li>
              <li>
                <a href={`mailto:${operator.email}`} className={`${footerLink} max-w-full break-all`}>
                  {operator.email}
                </a>
              </li>
              <li>
                <a href={`tel:${operator.phone}`} className={footerLink}>
                  {operator.phone}
                </a>
              </li>
              <li className="py-1">Adresa: {operator.address}</li>
            </ul>
          </div>

          <nav className="lg:col-span-2" aria-labelledby="footer-proizvod">
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

          <nav className="lg:col-span-2" aria-labelledby="footer-nalog">
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
                  Registruj se
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-labelledby="footer-pravno">
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
