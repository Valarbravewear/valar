/* =========================================================
   VALAR LOGIN
   SUPABASE AUTHENTICATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");

  if (!form || !msg) {
    console.error(
      "VALAR login form or message element not found."
    );
    return;
  }


  /* =======================================================
     VALAR ADMIN EMAILS
  ======================================================= */

  const VALAR_ADMIN_EMAILS = [
    "mejaalex33@gmail.com",
    "mercydrainagecuthanasia@gmail.com"
  ];


  /* =======================================================
     LOGIN FORM
  ======================================================= */

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    msg.textContent = "Signing in…";


    const submitButton =
      form.querySelector('button[type="submit"]');


    if (submitButton) {
      submitButton.disabled = true;
    }


    try {

      /* =====================================================
         CHECK SUPABASE
      ===================================================== */

      if (!window.valarSupabase) {

        msg.textContent =
          "Database connection is not configured.";

        return;
      }


      /* =====================================================
         GET FORM DATA
      ===================================================== */

      const data = new FormData(form);

      const email =
        String(data.get("email") || "")
          .trim()
          .toLowerCase();

      const password =
        String(data.get("password") || "");


      if (!email || !password) {

        msg.textContent =
          "Please enter your email and password.";

        return;
      }


      /* =====================================================
         SIGN IN
      ===================================================== */

      const { data: authData, error } =
        await window.valarSupabase.auth.signInWithPassword({
          email: email,
          password: password
        });


      if (error) {

        console.error(
          "VALAR login error:",
          error
        );

        msg.textContent =
          error.message || "Unable to sign in.";

        return;
      }


      /* =====================================================
         VERIFY SESSION
      ===================================================== */

      if (
        !authData ||
        !authData.session ||
        !authData.user
      ) {

        msg.textContent =
          "Login failed. No active session was created.";

        return;
      }


      /* =====================================================
         VERIFY ADMIN EMAIL
      ===================================================== */

      const loggedInEmail =
        String(authData.user.email || "")
          .trim()
          .toLowerCase();


      if (!VALAR_ADMIN_EMAILS.includes(loggedInEmail)) {

        console.warn(
          "Unauthorized VALAR login attempt:",
          loggedInEmail
        );


        /* Sign the unauthorized account back out */

        await window.valarSupabase.auth.signOut();


        msg.textContent =
          "This account is not authorized to access the VALAR admin area.";

        return;
      }


      /* =====================================================
         SUCCESS
      ===================================================== */

      msg.textContent =
        "Login successful. Redirecting…";


      window.location.href =
        "index.html";


    } catch (error) {

      console.error(
        "Unexpected VALAR login error:",
        error
      );


      msg.textContent =
        "Something went wrong. Please try again.";


    } finally {

      if (submitButton) {
        submitButton.disabled = false;
      }

    }

  });

});