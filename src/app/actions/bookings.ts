"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { submitPayment } from "@/server/payments";
import {
  addParticipant,
  cancelReservation,
  checkIn,
  createReservation,
  removeParticipant,
  setAttended,
} from "@/server/reservations";
import { getActor } from "@/lib/session";
import { failure, field, idOf, type ActionState } from "./state";

const refresh = (id: number) => revalidatePath(`/bookings/${id}`);

export async function createBookingAction(_: ActionState, form: FormData): Promise<ActionState> {
  let id: number;
  try {
    const r = await createReservation(getDb(), await getActor(), {
      spaceId: field(form, "spaceId"),
      date: field(form, "date"),
      startTime: field(form, "startTime"),
      endTime: field(form, "endTime"),
      purpose: field(form, "purpose"),
      headcount: field(form, "headcount"),
    });
    id = r.reservationId;
  } catch (e) {
    return failure(e);
  }
  redirect(`/bookings/${id}?new=1`);
}

export async function submitPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = idOf(form);
  try {
    await submitPayment(getDb(), await getActor(), id, {
      method: field(form, "method"),
      referenceNo: field(form, "referenceNo"),
    });
  } catch (e) {
    return failure(e);
  }
  refresh(id);
  return { ok: "Payment sent. Staff will check the reference." };
}

export async function cancelBookingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = idOf(form);
  try {
    await cancelReservation(getDb(), await getActor(), id, new Date(), field(form, "note"));
  } catch (e) {
    return failure(e);
  }
  refresh(id);
  return { ok: "Booking cancelled." };
}

export async function checkInAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = idOf(form);
  try {
    await checkIn(getDb(), await getActor(), id);
  } catch (e) {
    return failure(e);
  }
  refresh(id);
  return { ok: "Checked in." };
}

export async function addParticipantAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = idOf(form);
  try {
    await addParticipant(getDb(), await getActor(), id, {
      fullName: field(form, "fullName"),
      email: field(form, "email"),
      affiliation: field(form, "affiliation"),
    });
  } catch (e) {
    return failure(e);
  }
  refresh(id);
  return { ok: "Participant added." };
}

export async function removeParticipantAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await removeParticipant(getDb(), await getActor(), idOf(form, "participantId"));
  } catch (e) {
    return failure(e);
  }
  refresh(idOf(form));
  return undefined;
}

export async function setAttendedAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await setAttended(getDb(), await getActor(), idOf(form, "participantId"), field(form, "attended") === "true");
  } catch (e) {
    return failure(e);
  }
  refresh(idOf(form));
  return undefined;
}
