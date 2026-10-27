"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRate, deleteRate, updateRate, updateSpace } from "@/server/admin";
import { getDb } from "@/server/db";
import { recordPayment, rejectPayment, verifyPayment, voidPayment } from "@/server/payments";
import { setOutcome } from "@/server/reservations";
import { getActor } from "@/lib/session";
import { failure, field, idOf, type ActionState } from "./state";

const refreshBooking = (form: FormData) => {
  revalidatePath(`/bookings/${idOf(form)}`);
  revalidatePath("/admin");
};

// From the queue the row leaves the list, so say what happened on the page.
const backToQueue = (form: FormData, done: string, ref?: string | null) => {
  if (field(form, "from") !== "queue") return;
  redirect(`/admin?${new URLSearchParams({ done, ref: ref ?? "" })}`);
};

export async function verifyPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  let ref: string | null;
  try {
    ref = (await verifyPayment(getDb(), await getActor(), idOf(form, "paymentId"))).referenceNo;
  } catch (e) {
    return failure(e);
  }
  refreshBooking(form);
  backToQueue(form, "verified", ref);
  return { ok: "Payment verified." };
}

export async function rejectPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  let ref: string | null;
  try {
    ref = (await rejectPayment(getDb(), await getActor(), idOf(form, "paymentId"), field(form, "note"))).referenceNo;
  } catch (e) {
    return failure(e);
  }
  refreshBooking(form);
  backToQueue(form, "rejected", ref);
  return { ok: "Payment rejected. The user can submit again." };
}

export async function recordPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await recordPayment(getDb(), await getActor(), idOf(form), {
      amount: field(form, "amount"),
      method: field(form, "method"),
      referenceNo: field(form, "referenceNo"),
    });
  } catch (e) {
    return failure(e);
  }
  refreshBooking(form);
  return { ok: "Payment recorded." };
}

export async function voidPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await voidPayment(getDb(), await getActor(), idOf(form, "paymentId"), field(form, "note"));
  } catch (e) {
    return failure(e);
  }
  refreshBooking(form);
  return { ok: "Payment voided." };
}

export async function setOutcomeAction(_: ActionState, form: FormData): Promise<ActionState> {
  const outcome = field(form, "outcome") === "completed" ? "completed" : "no_show";
  try {
    await setOutcome(getDb(), await getActor(), idOf(form), outcome);
  } catch (e) {
    return failure(e);
  }
  refreshBooking(form);
  return { ok: outcome === "completed" ? "Marked completed." : "Marked no-show." };
}

const rateInput = (form: FormData) => ({
  spaceId: field(form, "spaceId"),
  dayOfWeek: field(form, "dayOfWeek"),
  startTime: field(form, "startTime"),
  endTime: field(form, "endTime"),
  hourlyRate: field(form, "hourlyRate"),
  isPeak: field(form, "isPeak") ?? "",
  effectiveFrom: field(form, "effectiveFrom"),
  effectiveTo: field(form, "effectiveTo"),
});

export async function createRateAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createRate(getDb(), await getActor(), rateInput(form));
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/rates");
  return { ok: "Rate added." };
}

export async function updateRateAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateRate(getDb(), await getActor(), idOf(form), rateInput(form));
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/rates");
  redirect("/admin/rates");
}

export async function deleteRateAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await deleteRate(getDb(), await getActor(), idOf(form));
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/rates");
  return { ok: "Rate deleted." };
}

export async function updateSpaceAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateSpace(getDb(), await getActor(), idOf(form), {
      name: field(form, "name"),
      spaceType: field(form, "spaceType"),
      capacity: field(form, "capacity"),
      isActive: field(form, "isActive") ?? "",
    });
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/spaces");
  return { ok: "Space saved." };
}
