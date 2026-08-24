import { PlatformApp } from "./PlatformApp.js";
import { isOwnerRoute, OwnerPortalApp } from "./OwnerPages.js";
import { CompanyPortalApp } from "./CompanyPages.js";
import { isCompanyRoute, isExpansionRoute } from "./route-predicates.js";
import { isManufacturerRoute, ManufacturerPortalApp } from "./ManufacturerPages.js";
import { isTimelineRoute, TimelineRouteApp } from "./ActivityTimeline.js";
import { ExpansionPage } from "./ExpansionPages.js";
import { FinancialSettings } from "./FinancialSettings.js";
import { ManufacturerFinance } from "./ManufacturerFinance.js";
import { FinanceAdmin } from "./FinanceAdmin.js";
import { isMarketplaceRoute, MarketplacePage } from "./MarketplacePages.js";
export function RootApp() {
  if (isMarketplaceRoute(location.pathname))
    return <MarketplacePage path={location.pathname} />;
  if (location.pathname === "/platform/finance") return <FinanceAdmin />;
  if (location.pathname === "/manufacturer/payments-payouts")
    return <ManufacturerFinance />;
  if (location.pathname === "/account/payments-banking") return <FinancialSettings />;
  if (isExpansionRoute(location.pathname))
    return <ExpansionPage path={location.pathname} />;
  if (isTimelineRoute(location.pathname)) return <TimelineRouteApp />;
  if (isOwnerRoute(location.pathname)) return <OwnerPortalApp />;
  if (isCompanyRoute(location.pathname)) return <CompanyPortalApp />;
  if (isManufacturerRoute(location.pathname)) return <ManufacturerPortalApp />;
  return <PlatformApp />;
}
