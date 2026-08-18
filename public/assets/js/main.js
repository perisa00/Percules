(function () {
  "use strict";

  var config = window.PERCULES_CONFIG;
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.querySelector(".site-nav");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMenuState(isOpen, returnFocus) {
    if (!menuButton || !navigation) {
      return;
    }

    menuButton.setAttribute("aria-expanded", String(isOpen));
    navigation.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);

    var accessibleLabel = menuButton.querySelector(".visually-hidden");
    if (accessibleLabel) {
      accessibleLabel.textContent = isOpen ? "Zatvori glavni meni" : "Otvori glavni meni";
    }

    if (returnFocus) {
      menuButton.focus();
    }
  }

  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var isOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen, false);
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenuState(false, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 928 && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, false);
      }
    });
  }

  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var targetId = link.getAttribute("href");
      var target = targetId && targetId.length > 1 ? document.querySelector(targetId) : null;
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  document.querySelectorAll("[data-current-year]").forEach(function (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  });

  var form = document.querySelector("#service-form");
  var formStatus = document.querySelector("#form-status");

  if (!form || !formStatus || !config) {
    return;
  }

  var fieldRules = [
    { name: "fullName", id: "full-name", errorId: "full-name-error", message: "Unesite ime i prezime." },
    { name: "contact", id: "contact-value", errorId: "contact-value-error", message: "Unesite telefon ili email za odgovor." },
    { name: "manufacturer", id: "manufacturer", errorId: "manufacturer-error", message: "Unesite proizvođača laptopa." },
    { name: "model", id: "model", errorId: "model-error", message: "Unesite model laptopa." },
    { name: "problem", id: "problem", errorId: "problem-error", message: "Opišite problem sa laptopom." },
    { name: "powerStatus", id: "power-status", errorId: "power-status-error", message: "Izaberite da li se laptop uključuje." },
    { name: "dataImportance", id: "data-importance", errorId: "data-importance-error", message: "Izaberite koliko su podaci važni." }
  ];

  function normalizeSingleLine(value) {
    return value.replace(/[\u0000-\u001F\u007F]+/g, " ").trim().replace(/\s+/g, " ");
  }

  function normalizeMultiline(value) {
    return value
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) { return line.replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, " ").trim().replace(/[ \t]+/g, " "); })
      .filter(function (line) { return line.length > 0; })
      .join("\n")
      .trim();
  }

  function setError(control, errorId, message) {
    var error = document.getElementById(errorId);
    if (control) {
      control.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (error) {
      error.textContent = message || "";
    }
  }

  function clearErrors() {
    fieldRules.forEach(function (rule) {
      setError(document.getElementById(rule.id), rule.errorId, "");
    });

    var replyGroup = form.querySelector(".choice-group");
    setError(replyGroup, "reply-preference-error", "");
    setError(document.getElementById("safe-content"), "safe-content-error", "");
    formStatus.textContent = "";
    formStatus.classList.remove("is-error");
  }

  function isContactValueReasonable(value) {
    if (value.indexOf("@") !== -1) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return value.replace(/\D/g, "").length >= 6;
  }

  function readAndValidate() {
    clearErrors();
    var values = {};
    var firstInvalid = null;

    fieldRules.forEach(function (rule) {
      var control = form.elements[rule.name];
      var rawValue = control ? control.value : "";
      var value = rule.name === "problem" ? normalizeMultiline(rawValue) : normalizeSingleLine(rawValue);
      values[rule.name] = value;

      if (!value) {
        setError(control, rule.errorId, rule.message);
        firstInvalid = firstInvalid || control;
      }
    });

    var contactControl = form.elements.contact;
    if (values.contact && !isContactValueReasonable(values.contact)) {
      setError(contactControl, "contact-value-error", "Proverite da li je telefon ili email pravilno unet.");
      firstInvalid = firstInvalid || contactControl;
    }

    var selectedReply = form.querySelector('input[name="replyPreference"]:checked');
    values.replyPreference = selectedReply ? normalizeSingleLine(selectedReply.value) : "";
    if (!selectedReply) {
      var replyGroup = form.querySelector(".choice-group");
      setError(replyGroup, "reply-preference-error", "Izaberite željeni način odgovora.");
      firstInvalid = firstInvalid || form.querySelector('input[name="replyPreference"]');
    }

    var consent = form.elements.safeContent;
    if (!consent.checked) {
      setError(consent, "safe-content-error", "Potvrdite da poruka ne sadrži osetljive pristupne podatke.");
      firstInvalid = firstInvalid || consent;
    }

    return { values: values, firstInvalid: firstInvalid };
  }

  function buildMailto(values) {
    var device = normalizeSingleLine([values.manufacturer, values.model].filter(Boolean).join(" "));
    var subject = "Upit za servis laptopa – " + device;
    var lines = [
      "Pozdrav,",
      "",
      "želim da prijavim laptop za pregled.",
      "",
      "Ime: " + values.fullName,
      "Kontakt: " + values.contact,
      "Proizvođač: " + values.manufacturer,
      "Model: " + values.model,
      "Opis problema: " + values.problem,
      "Da li se uključuje: " + values.powerStatus,
      "Važnost podataka: " + values.dataImportance,
      "Željeni način odgovora: " + values.replyPreference,
      "",
      "Potvrđujem da poruka ne sadrži lozinke ili druge osetljive pristupne podatke."
    ].filter(function (line) { return line !== null && line !== undefined; });

    return "mailto:" + config.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var result = readAndValidate();

    if (result.firstInvalid) {
      formStatus.textContent = "Proverite označena polja pre pripreme poruke.";
      formStatus.classList.add("is-error");
      result.firstInvalid.focus();
      return;
    }

    formStatus.classList.remove("is-error");
    formStatus.textContent = "Otvara se vaša email aplikacija. Poruka još nije poslata — pregledajte je i sami potvrdite slanje.";
    window.location.assign(buildMailto(result.values));
  });

  form.addEventListener("input", function (event) {
    var rule = fieldRules.find(function (candidate) { return candidate.name === event.target.name; });
    if (rule && event.target.getAttribute("aria-invalid") === "true") {
      setError(event.target, rule.errorId, "");
    }
    if (event.target.name === "replyPreference") {
      setError(form.querySelector(".choice-group"), "reply-preference-error", "");
    }
    if (event.target.name === "safeContent") {
      setError(event.target, "safe-content-error", "");
    }
  });
}());
