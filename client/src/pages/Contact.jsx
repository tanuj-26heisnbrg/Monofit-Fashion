const CONTACT_EMAIL = "support@monofit.example";

export default function Contact() {
  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = `Contact form message from ${form.get("name")}`;
    const body = [
      `Name: ${form.get("name")}`,
      `Email: ${form.get("email")}`,
      `Phone: ${form.get("phone") || "Not provided"}`,
      "",
      "Message:",
      form.get("message"),
    ].join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-16 md:py-20">
      <h1 className="font-display text-4xl md:text-5xl">Contact</h1>
      <p className="mt-4 text-sm text-neutral-700">
        Email{" "}
        <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        for any queries.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="lbl" htmlFor="contact-name">Name</label>
            <input className="inp" id="contact-name" name="name" autoComplete="name" required />
          </div>
          <div>
            <label className="lbl" htmlFor="contact-email">Email</label>
            <input className="inp" id="contact-email" name="email" type="email" autoComplete="email" required />
          </div>
        </div>
        <div>
          <label className="lbl" htmlFor="contact-phone">Phone</label>
          <input className="inp" id="contact-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <label className="lbl" htmlFor="contact-message">Message</label>
          <textarea className="inp min-h-48 resize-y" id="contact-message" name="message" rows="7" required />
        </div>
        <button className="btn rounded-full px-7" type="submit">Submit</button>
        <p className="text-xs text-neutral-500">
          Submitting opens your email app with the message ready to send.
        </p>
      </form>
    </section>
  );
}
