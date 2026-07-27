"use client";

import * as React from "react";
import {
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import {
  useHabits,
  useArchivedHabits,
  useSetArchived,
  useDeleteHabit,
} from "@/hooks/use-habits";
import { frequencyLabel } from "@/lib/frequency";
import { getColor } from "@/lib/colors";
import type { Habit } from "@/types/db";

export function HabitsManager() {
  const { data: habits, isLoading } = useHabits();
  const { data: archived } = useArchivedHabits();
  const setArchived = useSetArchived();
  const deleteHabit = useDeleteHabit();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [toDelete, setToDelete] = React.useState<Habit | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes habitudes</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle</span>
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (habits ?? []).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune habitude active. Crée-en une pour commencer.
        </Card>
      ) : (
        <ul className="space-y-2">
          {habits!.map((habit) => (
            <li key={habit.id}>
              <HabitRow
                habit={habit}
                onEdit={() => setEditing(habit)}
                onArchive={() =>
                  setArchived.mutate({ id: habit.id, archived: true })
                }
                onDelete={() => setToDelete(habit)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Archivées */}
      {(archived ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="pt-2 text-sm font-medium text-muted-foreground">
            Archivées
          </h2>
          <ul className="space-y-2">
            {archived!.map((habit) => (
              <li key={habit.id}>
                <HabitRow
                  habit={habit}
                  archivedRow
                  onRestore={() =>
                    setArchived.mutate({ id: habit.id, archived: false })
                  }
                  onDelete={() => setToDelete(habit)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dialogs */}
      <HabitFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <HabitFormDialog
        habit={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {toDelete?.name} » ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive et efface aussi l&apos;historique de
              cette habitude. Pour la mettre de côté sans perdre les données,
              préfère l&apos;archivage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) deleteHabit.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HabitRow({
  habit,
  archivedRow,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  habit: Habit;
  archivedRow?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  const color = getColor(habit.color);
  return (
    <Card className="flex items-center gap-3 p-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: color.soft }}
      >
        {habit.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{habit.name}</p>
        <p className="text-xs text-muted-foreground">
          {frequencyLabel(habit)}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!archivedRow && (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4" />
                Archiver
              </DropdownMenuItem>
            </>
          )}
          {archivedRow && (
            <DropdownMenuItem onClick={onRestore}>
              <ArchiveRestore className="h-4 w-4" />
              Restaurer
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
