import { AppRouter } from "@/routes/app-router";
import { I18nProvider } from "@/shared/i18n/i18n-provider";

export function App() {
  return (
    <I18nProvider>
      <AppRouter />
    </I18nProvider>
  );
}
