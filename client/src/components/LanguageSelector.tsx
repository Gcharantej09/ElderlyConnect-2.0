import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-5 w-5 text-muted-foreground" />
      <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "te" | "hi")}>
        <SelectTrigger className="w-36 h-10" data-testid="select-language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en" data-testid="lang-english">{t("language.english")}</SelectItem>
          <SelectItem value="te" data-testid="lang-telugu">{t("language.telugu")}</SelectItem>
          <SelectItem value="hi" data-testid="lang-hindi">{t("language.hindi")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
