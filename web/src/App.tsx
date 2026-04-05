import { AppRouter } from "@/routes/app-router";
import { I18nProvider } from "@/shared/i18n/i18n-provider";
import { ThemeProvider } from "@/shared/theme/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppRouter />
      </I18nProvider>
    </ThemeProvider>
  );
}
