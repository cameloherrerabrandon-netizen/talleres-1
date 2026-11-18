
(function () {

    var KEY = "uniPracticas.v1";
    var tasks = [];
    var filter = "todas";

    var $ = function (id) {
        return document.getElementById(id);
    };


    function load() {
        try {
            var r = localStorage.getItem(KEY);

            tasks = r ? JSON.parse(r) : [];

            if (!Array.isArray(tasks)) {
                tasks = [];
            }

        } catch (e) {
            tasks = [];
        }
    }


    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(tasks));
        } catch (e) {}
    }


    function uid() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 6);
    }


    function todayStr() {
        var d = new Date();

        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }


    function dayDiff(str) {
        var a = new Date(todayStr() + "T00:00:00");
        var b = new Date(str + "T00:00:00");

        return Math.round((b - a) / 86400000);
    }


    function addDays(n) {
        var d = new Date();

        d.setDate(d.getDate() + n);

        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }


    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[c];
        });
    }


    function fmt(str) {
        var p = str.split("-");

        var m = [
            "ene", "feb", "mar", "abr",
            "may", "jun", "jul", "ago",
            "sep", "oct", "nov", "dic"
        ];

        return parseInt(p[2], 10) + " " +
            m[parseInt(p[1], 10) - 1] + " " + p[0];
    }


    function dueText(t) {

        if (t.status === "hecha") {
            return "Entrega: " + fmt(t.due);
        }

        var n = dayDiff(t.due);

        if (n < 0) {
            return '<span class="late">Vencida hace ' +
                (-n) +
                (n === -1 ? " día" : " días") +
                "</span> · " + fmt(t.due);
        }

        if (n === 0) {
            return '<span class="late">Vence hoy</span>';
        }

        if (n === 1) {
            return "Vence mañana · " + fmt(t.due);
        }

        return "Vence en " + n + " días · " + fmt(t.due);
    }


    function toast(msg) {
        var t = $("toast");

        t.textContent = msg;
        t.classList.add("on");

        clearTimeout(toast.h);

        toast.h = setTimeout(function () {
            t.classList.remove("on");
        }, 1800);
    }


    function stats() {

        var total = tasks.length;
        var done = 0;
        var soon = 0;
        var late = 0;

        tasks.forEach(function (t) {

            if (t.status === "hecha") {
                done++;
                return;
            }

            var n = dayDiff(t.due);

            if (n < 0) {
                late++;
            } else if (n <= 7) {
                soon++;
            }

        });

        var pct = total ? Math.round(done / total * 100) : 0;

        $("sTotal").textContent = total;
        $("sSoon").textContent = soon;
        $("sLate").textContent = late;
        $("sPct").textContent = pct + "%";

        $("sBar").style.width = pct + "%";
    }


    function render() {

        var items = tasks.filter(function (t) {
            return filter === "todas" || t.status === filter;
        });

        items.sort(function (a, b) {

            if ((a.status === "hecha") !== (b.status === "hecha")) {
                return a.status === "hecha" ? 1 : -1;
            }

            return a.due < b.due ? -1 :
                a.due > b.due ? 1 : 0;

        });

        var ul = $("list");

        if (!items.length) {

            ul.innerHTML =
                '<li class="empty">' +
                (tasks.length
                    ? "No hay actividades con este estado."
                    : "Aún no tienes actividades. Agrega la primera con el formulario o carga ejemplos.") +
                "</li>";

        } else {

            ul.innerHTML = items.map(function (t) {

                var logs = (t.logs || []).map(function (l) {
                    return "<li><time>" +
                        esc(l.d) +
                        "</time>" +
                        esc(l.t) +
                        "</li>";
                }).join("");

                return '<li class="task ' + t.status +
                    '" data-id="' + t.id + '">' +

                    '<div class="top"><div>' +

                    '<p class="tt">' +
                    esc(t.title) +
                    '</p><div class="meta">' +
                    esc(t.cat) + " · " + dueText(t) +
                    "</div>" +

                    (t.note
                        ? '<div class="meta">' + esc(t.note) + "</div>"
                        : "") +

                    "</div>" +

                    '<select data-act="status" aria-label="Estado de ' +
                    esc(t.title) + '">' +

                    ["pendiente", "progreso", "hecha"].map(function (s) {

                        var lbl = {
                            pendiente: "Pendiente",
                            progreso: "En progreso",
                            hecha: "Hecha"
                        }[s];

                        return '<option value="' + s + '"' +
                            (t.status === s ? " selected" : "") +
                            ">" + lbl + "</option>";

                    }).join("") +

                    "</select></div>" +

                    '<div class="log"><strong>Avances</strong>' +

                    (logs
                        ? "<ol>" + logs + "</ol>"
                        : '<div class="meta" style="margin:4px 0 8px">Sin avances registrados.</div>') +

                    '<div class="add">' +
                    '<input data-in="log" maxlength="120" placeholder="Escribe un avance" aria-label="Nuevo avance">' +
                    '<button class="ghost" data-act="log" type="button">Agregar</button>' +
                    "</div></div>" +

                    '<div class="row">' +
                    '<button class="ghost del" data-act="del" type="button">Eliminar</button>' +
                    "</div></li>";

            }).join("");
        }

        stats();
    }


    $("f").addEventListener("submit", function (e) {

        e.preventDefault();

        var title = $("title").value.trim();
        var due = $("due").value;

        if (!title) {
            $("err").textContent = "Escribe el nombre de la actividad.";
            $("title").focus();
            return;
        }

        if (!due) {
            $("err").textContent = "Elige una fecha de entrega.";
            $("due").focus();
            return;
        }

        $("err").textContent = "";

        tasks.push({
            id: uid(),
            title: title,
            due: due,
            cat: $("cat").value,
            note: $("note").value.trim(),
            status: "pendiente",
            logs: []
        });

        save();
        render();

        $("f").reset();

        toast("Actividad guardada");
    });


    $("list").addEventListener("change", function (e) {

        if (e.target.dataset.act !== "status") {
            return;
        }

        var t = tasks.find(function (x) {
            return x.id === e.target.closest(".task").dataset.id;
        });

        if (t) {
            t.status = e.target.value;

            save();
            render();

            toast("Estado actualizado");
        }
    });


    function addLog(li) {

        var t = tasks.find(function (x) {
            return x.id === li.dataset.id;
        });

        var inp = li.querySelector('[data-in="log"]');
        var txt = inp.value.trim();

        if (!t || !txt) {
            return;
        }

        t.logs = t.logs || [];

        t.logs.push({
            d: fmt(todayStr()),
            t: txt
        });

        if (t.status === "pendiente") {
            t.status = "progreso";
        }

        save();
        render();

        toast("Avance registrado");
    }


    $("list").addEventListener("click", function (e) {

        var act = e.target.dataset.act;
        var li = e.target.closest(".task");

        if (!li) {
            return;
        }

        if (act === "log") {
            addLog(li);
        }

        if (act === "del" && confirm("¿Eliminar esta actividad?")) {

            tasks = tasks.filter(function (x) {
                return x.id !== li.dataset.id;
            });

            save();
            render();

            toast("Actividad eliminada");
        }
    });


    $("list").addEventListener("keydown", function (e) {

        if (e.key === "Enter" && e.target.dataset.in === "log") {

            e.preventDefault();

            addLog(e.target.closest(".task"));
        }
    });


    $("filters").addEventListener("click", function (e) {

        var f = e.target.dataset.f;

        if (!f) {
            return;
        }

        filter = f;

        Array.prototype.forEach.call(
            $("filters").children,
            function (b) {
                b.setAttribute(
                    "aria-pressed",
                    String(b.dataset.f === f)
                );
            }
        );

        render();
    });


    $("demo").addEventListener("click", function () {

        tasks = tasks.concat([

            {
                id: uid(),
                title: "Informe de avance parcial",
                due: addDays(3),
                cat: "Informe",
                note: "Incluye horas y actividades de las primeras semanas.",
                status: "progreso",
                logs: [
                    {
                        d: fmt(todayStr()),
                        t: "Redacté la introducción y el listado de tareas."
                    }
                ]
            },

            {
                id: uid(),
                title: "Reunión con el tutor",
                due: addDays(1),
                cat: "Reunión con tutor",
                note: "",
                status: "pendiente",
                logs: []
            },

            {
                id: uid(),
                title: "Entrega de bitácora semanal",
                due: addDays(-2),
                cat: "Entrega",
                note: "",
                status: "pendiente",
                logs: []
            },

            {
                id: uid(),
                title: "Formato de inscripción de práctica",
                due: addDays(-9),
                cat: "Tarea de práctica",
                note: "",
                status: "hecha",
                logs: []
            }

        ]);

        save();
        render();

        toast("Ejemplos cargados");
    });


    $("theme").addEventListener("click", function () {

        var r = document.documentElement;
        var cur = r.getAttribute("data-theme");

        var dark = cur
            ? cur === "dark"
            : window.matchMedia("(prefers-color-scheme: dark)").matches;

        r.setAttribute("data-theme", dark ? "light" : "dark");
    });


    $("due").min = todayStr();

    load();
    render();

})();
