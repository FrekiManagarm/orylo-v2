"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldContent,
  FieldDescription,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2,
  ChevronRight,
  Info,
  Zap,
  Filter,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { updateRule, type CreateRuleInput } from "@/lib/actions/rules";
import { cn } from "@/lib/utils";
import { InferSelectModel } from "drizzle-orm";
import { fraudDetectionRules } from "@/lib/db/schemas/fraudDetectionRules";

type Rule = InferSelectModel<typeof fraudDetectionRules>;

// Schema de validation pour le formulaire
const editRuleFormSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  description: z.string(),
  enabled: z.boolean(),
  priority: z.number().int().min(0, "La priorité doit être supérieure ou égale à 0"),
  action: z.enum(["block", "review", "require_3ds", "alert_only"]),
  conditionField: z.string().min(1, "Le champ est requis"),
  conditionOperator: z.enum(["gt", "lt", "eq", "in", "contains"]),
  conditionValue: z.string().min(1, "La valeur est requise"),
  threshold: z.number().int().optional(),
});

type EditRuleFormValues = z.infer<typeof editRuleFormSchema>;

interface EditRuleDialogProps {
  rule: Rule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    id: 1,
    title: "Informations",
    icon: Info,
  },
  {
    id: 2,
    title: "Action",
    icon: Zap,
  },
  {
    id: 3,
    title: "Conditions",
    icon: Filter,
  },
];

export function EditRuleDialog({
  rule,
  open,
  onOpenChange,
}: EditRuleDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Extraire les valeurs de la règle pour pré-remplir le formulaire
  const getDefaultValues = (): EditRuleFormValues => {
    const conditions = rule.condition;
    return {
      name: rule.name || "",
      description: rule.description || "",
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 0,
      action: rule.action as "block" | "review" | "require_3ds" | "alert_only",
      conditionField:
        conditions?.field || "",
      conditionOperator:
        conditions?.operator as "gt" | "lt" | "eq" | "in" | "contains" || "gt",
      conditionValue: Array.isArray(conditions?.value)
        ? conditions.value.join(", ")
        : String(conditions?.value || ""),
      threshold: rule.threshold ?? undefined,
    };
  };

  const updateRuleMutation = useMutation({
    mutationFn: async (values: EditRuleFormValues) => {
      // Construction de l'objet conditions à partir des champs du formulaire
      const conditions = {
        field: values.conditionField,
        operator: values.conditionOperator,
        value:
          values.conditionOperator === "in"
            ? values.conditionValue.split(",").map((v) => v.trim())
            : isNaN(Number(values.conditionValue))
              ? values.conditionValue
              : Number(values.conditionValue),
      };

      const input: Partial<CreateRuleInput> = {
        name: values.name,
        description: values.description || undefined,
        enabled: values.enabled,
        priority: values.priority,
        action: values.action,
        conditions,
        threshold: values.threshold,
      };

      return updateRule(rule.id, input);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Règle modifiée avec succès !");
        form.reset();
        onOpenChange(false);
        // Invalider les queries pour rafraîchir la liste
        queryClient.invalidateQueries({ queryKey: ["rules"] });
        // Revalider la page
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la modification de la règle");
      }
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast.error("Une erreur est survenue lors de la modification de la règle");
    },
  });

  const form = useForm({
    validators: {
      onSubmit: editRuleFormSchema,
    },
    onSubmit: async (values) => {
      await updateRuleMutation.mutateAsync(values.value);
    },
    defaultValues: getDefaultValues(),
  });

  // Réinitialiser le formulaire quand la règle change
  useEffect(() => {
    if (open && rule) {
      const newValues = getDefaultValues();
      form.reset();
      // Update each field individually
      Object.entries(newValues).forEach(([key, value]) => {
        form.setFieldValue(key as any, value);
      });
      setCurrentStep(1);
    }
  }, [open, rule]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof EditRuleFormValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["name", "description", "priority", "enabled"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["action", "threshold"];
    }

    // Validate fields manually for TanStack Form
    const isValid = fieldsToValidate.every((fieldName) => {
      const field = form.getFieldMeta(fieldName);
      return field?.errors?.length === 0 || !field?.isTouched;
    });

    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setCurrentStep(1);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/5 text-white sm:max-w-[600px] overflow-hidden p-0 gap-0 shadow-2xl shadow-black/50">
        <DialogHeader className="px-6 py-6 border-b border-white/5 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium tracking-tight text-white">
              Modifier la règle
            </DialogTitle>
            <div className="flex items-center gap-1.5 bg-zinc-900/50 rounded-full px-3 py-1 border border-white/5">
              <span className="text-xs font-medium text-zinc-400">
                Étape {currentStep}
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-xs font-medium text-zinc-600">
                {steps.length}
              </span>
            </div>
          </div>

          {/* Minimalist Progress Bar */}
          <div className="mt-6 flex items-center gap-2">
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex-1 flex flex-col gap-2 group">
                  <div
                    className={cn(
                      "h-1 w-full rounded-full transition-all duration-300",
                      isActive
                        ? "bg-indigo-500"
                        : isCompleted
                          ? "bg-indigo-500/50"
                          : "bg-zinc-800",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-medium transition-colors duration-300",
                      isActive
                        ? "text-indigo-400"
                        : isCompleted
                          ? "text-zinc-400"
                          : "text-zinc-600",
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col"
        >
          <div className="p-6 min-h-[400px]">
            <FieldGroup>
              <AnimatePresence mode="wait" initial={false}>
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <form.Field
                        name="name"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field>
                              <FieldLabel className="text-zinc-400 font-normal">
                                Nom de la règle
                              </FieldLabel>
                              <FieldContent>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  placeholder="Ex: Transactions suspectes"
                                  className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-11 transition-colors"
                                  aria-invalid={isInvalid}
                                />
                              </FieldContent>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />

                      <form.Field
                        name="description"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field>
                              <FieldLabel className="text-zinc-400 font-normal">
                                Description
                              </FieldLabel>
                              <FieldContent>
                                <Textarea
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  placeholder="Objectif de cette règle..."
                                  className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 min-h-[100px] resize-none transition-colors"
                                  aria-invalid={isInvalid}
                                />
                              </FieldContent>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <form.Field
                          name="priority"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                              <Field>
                                <FieldLabel className="text-zinc-400 font-normal">
                                  Priorité
                                </FieldLabel>
                                <FieldContent>
                                  <Input
                                    id={field.name}
                                    name={field.name}
                                    type="number"
                                    min="0"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                    className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-11 transition-colors"
                                    aria-invalid={isInvalid}
                                  />
                                </FieldContent>
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            );
                          }}
                        />

                        <form.Field
                          name="enabled"
                          children={(field) => (
                            <Field className="flex flex-col justify-end pb-2">
                              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/30">
                                <span className="text-sm text-zinc-300">
                                  Statut actif
                                </span>
                                <Switch
                                  checked={field.state.value}
                                  onCheckedChange={(checked) => field.handleChange(checked)}
                                  className="data-[state=checked]:bg-indigo-500"
                                />
                              </div>
                            </Field>
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <form.Field
                        name="action"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field>
                              <FieldLabel className="text-zinc-400 font-normal">
                                Action à déclencher
                              </FieldLabel>
                              <FieldContent>
                                <Select
                                  value={field.state.value}
                                  onValueChange={(value) => field.handleChange(value as any)}
                                >
                                  <SelectTrigger className="bg-zinc-900/50 border-white/5 text-white focus:ring-indigo-500/50 focus:border-indigo-500/50 h-12">
                                    <SelectValue placeholder="Sélectionner une action" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-white/10">
                                    <SelectItem
                                      value="block"
                                      className="text-rose-400 focus:text-rose-400"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                                        <span>Bloquer la transaction</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="review"
                                      className="text-orange-400 focus:text-orange-400"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                                        <span>Marquer pour révision</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="require_3ds"
                                      className="text-indigo-400 focus:text-indigo-400"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                        <span>Exiger 3D Secure</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="alert_only"
                                      className="text-zinc-300 focus:text-white"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-zinc-500" />
                                        <span>Alerte uniquement</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FieldContent>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />

                      <form.Field
                        name="threshold"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field>
                              <FieldLabel className="text-zinc-400 font-normal">
                                Seuil de déclenchement (optionnel)
                              </FieldLabel>
                              <FieldContent>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  type="number"
                                  value={field.state.value ?? ""}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : undefined)}
                                  placeholder="Ex: 5"
                                  className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-11 transition-colors"
                                  aria-invalid={isInvalid}
                                />
                                <FieldDescription className="text-xs text-zinc-500">
                                  Nombre d'occurrences nécessaires
                                </FieldDescription>
                              </FieldContent>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <form.Field
                        name="conditionField"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field>
                              <FieldLabel className="text-zinc-400 font-normal">
                                Champ à analyser
                              </FieldLabel>
                              <FieldContent>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  placeholder="Ex: amount"
                                  className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-11 transition-colors"
                                  aria-invalid={isInvalid}
                                />
                              </FieldContent>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <form.Field
                          name="conditionOperator"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                              <Field>
                                <FieldLabel className="text-zinc-400 font-normal">
                                  Opérateur
                                </FieldLabel>
                                <FieldContent>
                                  <Select
                                    value={field.state.value}
                                    onValueChange={(value) => field.handleChange(value as any)}
                                  >
                                    <SelectTrigger className="bg-zinc-900/50 border-white/5 text-white focus:ring-indigo-500/50 focus:border-indigo-500/50 h-11">
                                      <SelectValue placeholder="Opérateur" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                      <SelectItem value="gt">
                                        Supérieur à {">"}
                                      </SelectItem>
                                      <SelectItem value="lt">
                                        Inférieur à {"<"}
                                      </SelectItem>
                                      <SelectItem value="eq">Égal à =</SelectItem>
                                      <SelectItem value="in">
                                        Dans la liste
                                      </SelectItem>
                                      <SelectItem value="contains">
                                        Contient
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FieldContent>
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            );
                          }}
                        />

                        <form.Field
                          name="conditionValue"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                              <Field>
                                <FieldLabel className="text-zinc-400 font-normal">
                                  Valeur
                                </FieldLabel>
                                <FieldContent>
                                  <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="Ex: 1000"
                                    className="bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-11 transition-colors"
                                    aria-invalid={isInvalid}
                                  />
                                </FieldContent>
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            );
                          }}
                        />
                      </div>

                      <form.Subscribe
                        selector={(state) => ({
                          conditionField: state.values.conditionField,
                          conditionOperator: state.values.conditionOperator,
                          conditionValue: state.values.conditionValue,
                        })}
                        children={(state) => (
                          <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-4 mt-6">
                            <div className="flex items-start gap-3">
                              <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-zinc-200">
                                  Aperçu de la condition
                                </p>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                  Si{" "}
                                  <span className="text-indigo-300 font-mono bg-indigo-500/10 px-1 rounded">
                                    {state.conditionField || "champ"}
                                  </span>{" "}
                                  est{" "}
                                  <span className="text-zinc-300">
                                    {state.conditionOperator === "gt"
                                      ? "supérieur à"
                                      : state.conditionOperator === "lt"
                                        ? "inférieur à"
                                        : state.conditionOperator === "eq"
                                          ? "égal à"
                                          : state.conditionOperator === "in"
                                            ? "dans"
                                            : "contient"}
                                  </span>{" "}
                                  <span className="text-indigo-300 font-mono bg-indigo-500/10 px-1 rounded">
                                    {state.conditionValue || "valeur"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </FieldGroup>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-white/5 bg-zinc-900/30">
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-zinc-500 hover:text-white hover:bg-white/5"
              >
                Annuler
              </Button>

              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={prevStep}
                    className="text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Retour
                  </Button>
                )}

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-white text-black hover:bg-zinc-200"
                  >
                    Suivant
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={updateRuleMutation.isPending}
                    className="bg-indigo-500 text-white hover:bg-indigo-600 border border-indigo-400/20"
                  >
                    {updateRuleMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      <>
                        Modifier la règle
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
