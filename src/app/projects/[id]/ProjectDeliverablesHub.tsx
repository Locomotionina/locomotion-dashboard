"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateCategoryUrlsAction,
  addDeliverableAction,
  deleteDeliverableAction,
} from "@/actions/projects";
import {
  DeliverableCategoryKey,
  CategoryLinkItem,
  CATEGORY_DEFINITIONS,
  parseCategoryLinks,
  formatExternalUrl,
} from "@/lib/deliverables";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Edit3,
  Plus,
  Trash2,
  Globe,
  Presentation,
  Palette,
  FolderArchive,
  Copy,
  Check,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

interface DeliverableItem {
  id: string;
  title: string;
  url: string;
  type: string;
  status: string;
  createdAt: Date;
}

interface DeliverablesHubProps {
  projectId: string;
  previewUrl: string | null;
  pitchDeckUrl: string | null;
  creativeDeckUrl: string | null;
  finalAssetsUrl: string | null;
  customDeliverables: DeliverableItem[];
}

const CATEGORY_ICONS: Record<DeliverableCategoryKey, any> = {
  previewUrl: Globe,
  pitchDeckUrl: Presentation,
  creativeDeckUrl: Palette,
  finalAssetsUrl: FolderArchive,
};

export function ProjectDeliverablesHub({
  projectId,
  previewUrl,
  pitchDeckUrl,
  creativeDeckUrl,
  finalAssetsUrl,
  customDeliverables,
}: DeliverablesHubProps) {
  const router = useRouter();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Targeted Category Modal State
  const [activeCategoryKey, setActiveCategoryKey] = useState<DeliverableCategoryKey | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [formRows, setFormRows] = useState<CategoryLinkItem[]>([
    { label: "", url: "" },
    { label: "", url: "" },
    { label: "", url: "" },
    { label: "", url: "" },
  ]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Custom deliverable dialog state
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  const categoryValues: Record<DeliverableCategoryKey, string | null> = {
    previewUrl,
    pitchDeckUrl,
    creativeDeckUrl,
    finalAssetsUrl,
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenCategoryModal = (catKey: DeliverableCategoryKey) => {
    setActiveCategoryKey(catKey);
    const parsed = parseCategoryLinks(categoryValues[catKey], catKey);
    setFormRows(parsed);
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleRowChange = (index: number, field: "label" | "url", value: string) => {
    setFormRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSaveCategoryLinks = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCategoryKey) return;

    setSavingCategory(true);
    setCategoryError(null);

    const definition = CATEGORY_DEFINITIONS[activeCategoryKey];
    const sanitizedRows = formRows.map((r, idx) => ({
      label: definition.rows[idx].fixedLabel || r.label.trim(),
      url: r.url.trim(),
    }));

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("categoryKey", activeCategoryKey);
    formData.append("payload", JSON.stringify(sanitizedRows));

    const res = await updateCategoryUrlsAction(formData);
    setSavingCategory(false);

    if (res?.success) {
      setIsCategoryModalOpen(false);
      setActiveCategoryKey(null);
      router.refresh();
    } else {
      setCategoryError(res?.error || "Failed to update category links.");
    }
  };

  const handleAddCustomDeliverable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingCustom(true);
    const formData = new FormData(e.currentTarget);
    formData.append("projectId", projectId);

    await addDeliverableAction(formData);
    setLoadingCustom(false);
    setAddCustomOpen(false);
    router.refresh();
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (confirm("Are you sure you want to remove this deliverable URL?")) {
      await deleteDeliverableAction(deliverableId, projectId);
      router.refresh();
    }
  };

  const categories: DeliverableCategoryKey[] = [
    "previewUrl",
    "pitchDeckUrl",
    "creativeDeckUrl",
    "finalAssetsUrl",
  ];

  const activeCategoryDefinition = activeCategoryKey
    ? CATEGORY_DEFINITIONS[activeCategoryKey]
    : null;
  const ActiveCategoryIcon = activeCategoryKey ? CATEGORY_ICONS[activeCategoryKey] : null;

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-indigo-400" />
            <span>Centralized Deliverables & Master URLs</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Centralized hub for all client preview links, pitch decks, Figma boards, and asset drives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Custom Deliverable Dialog */}
          <Dialog open={addCustomOpen} onOpenChange={setAddCustomOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom URL</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleAddCustomDeliverable}>
                <DialogHeader>
                  <DialogTitle>Add Custom Deliverable Link</DialogTitle>
                  <DialogDescription className="text-xs">
                    Link additional assets, test builds, API documentation, or media kits.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Deliverable Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g. iOS TestFlight Build, Brand Guidelines PDF"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      name="url"
                      placeholder="https://..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type">Deliverable Category</Label>
                    <select
                      id="type"
                      name="type"
                      defaultValue="OTHER"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="PREVIEW" className="bg-popover text-foreground">Interactive Preview</option>
                      <option value="CREATIVE_DECK" className="bg-popover text-foreground">Creative / Figma</option>
                      <option value="PITCH_DECK" className="bg-popover text-foreground">Pitch / Strategy Deck</option>
                      <option value="FINAL_ASSET" className="bg-popover text-foreground">Final Assets & Masters</option>
                      <option value="OTHER" className="bg-popover text-foreground">Other Deliverable</option>
                    </select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddCustomOpen(false)}
                    disabled={loadingCustom}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loadingCustom} className="gap-2">
                    {loadingCustom && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Add Deliverable</span>
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Primary Deliverables Grid (4 Core Categories) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((catKey) => {
          const config = CATEGORY_DEFINITIONS[catKey];
          const Icon = CATEGORY_ICONS[catKey];
          const rawVal = categoryValues[catKey];
          const parsedRows = parseCategoryLinks(rawVal, catKey);
          const activeLinks = parsedRows.filter((r) => r.url && r.url.trim().length > 0);
          const hasLinks = activeLinks.length > 0;

          return (
            <Card
              key={catKey}
              className={`border transition-all flex flex-col justify-between ${
                hasLinks
                  ? "border-border/80 bg-card/70 hover:border-indigo-500/40"
                  : "border-dashed border-border/50 bg-secondary/20"
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg border ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {hasLinks ? (
                    <Badge variant="success" className="text-[9px]">
                      {activeLinks.length} {activeLinks.length === 1 ? "Link" : "Links"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      Not Set
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold">{config.name}</CardTitle>
                <CardDescription className="text-[11px] leading-tight">
                  {config.subtitle}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                {hasLinks ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                      {activeLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-secondary/40 border border-border/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-semibold text-[11px] text-foreground truncate"
                              title={link.label}
                            >
                              {link.label || "Untitled Link"}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:text-indigo-400"
                                title="Open link"
                              >
                                <a
                                  href={formatExternalUrl(link.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(link.url, `${catKey}-${idx}`)}
                                title="Copy link"
                              >
                                {copiedKey === `${catKey}-${idx}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            {link.url}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7 border-border/70 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors gap-1.5"
                      onClick={() => handleOpenCategoryModal(catKey)}
                    >
                      <Edit3 className="h-3 w-3 text-indigo-400" />
                      <span>Attach / Edit Links</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8 border-dashed border-border/80 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors gap-1.5"
                    onClick={() => handleOpenCategoryModal(catKey)}
                  >
                    <Plus className="h-3.5 w-3.5 text-indigo-400" />
                    <span>+ Attach Link</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Targeted Category Modal: Dynamic per category clicked */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-lg">
          {activeCategoryDefinition && (
            <form onSubmit={handleSaveCategoryLinks}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {ActiveCategoryIcon && (
                    <div className={`p-1.5 rounded-md border ${activeCategoryDefinition.color}`}>
                      <ActiveCategoryIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span>Attach Links — {activeCategoryDefinition.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure up to 4 deliverable links for {activeCategoryDefinition.name}.
                </DialogDescription>
              </DialogHeader>

              {categoryError && (
                <div className="mt-2 p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{categoryError}</span>
                </div>
              )}

              {/* Exactly 4 Rows */}
              <div className="space-y-3.5 py-4">
                {activeCategoryDefinition.rows.map((rowRule, idx) => {
                  const isFixed = Boolean(rowRule.fixedLabel);
                  const rowNumber = idx + 1;
                  const rowState = formRows[idx] || { label: "", url: "" };

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/60 bg-secondary/20 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                          Row {rowNumber}
                        </span>
                        {isFixed ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium"
                          >
                            Fixed Label
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-border/60"
                          >
                            Customizable
                          </Badge>
                        )}
                      </div>

                      {isFixed ? (
                        /* Fixed label: Only URL input needed */
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            {rowRule.fixedLabel}
                          </Label>
                          <Input
                            value={rowState.url}
                            onChange={(e) => handleRowChange(idx, "url", e.target.value)}
                            placeholder={rowRule.placeholderUrl || "https://..."}
                            className="text-xs h-9"
                          />
                        </div>
                      ) : (
                        /* Customizable: Custom Title input + URL input */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-muted-foreground">
                              Custom Title / Label
                            </Label>
                            <Input
                              value={rowState.label}
                              onChange={(e) => handleRowChange(idx, "label", e.target.value)}
                              placeholder={rowRule.placeholderTitle || "Custom Title / Label"}
                              className="text-xs h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-muted-foreground">
                              URL
                            </Label>
                            <Input
                              value={rowState.url}
                              onChange={(e) => handleRowChange(idx, "url", e.target.value)}
                              placeholder={rowRule.placeholderUrl || "https://..."}
                              className="text-xs h-9"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                  disabled={savingCategory}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCategory} className="gap-2">
                  {savingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Links</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Additional Deliverables Table / List */}
      {customDeliverables.length > 0 && (
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Additional Project Deliverables</CardTitle>
            <CardDescription className="text-xs">
              Supplementary assets and shared client links.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="divide-y divide-border/40">
              {customDeliverables.map((deliv) => (
                <div
                  key={deliv.id}
                  className="py-2.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                      {deliv.type}
                    </Badge>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">
                        {deliv.title}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {deliv.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                    >
                      <a href={formatExternalUrl(deliv.url)} target="_blank" rel="noopener noreferrer">
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => handleDeleteDeliverable(deliv.id)}
                      title="Remove Deliverable"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
