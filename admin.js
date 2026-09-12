/* =========================================================
   VALAR ADMIN DASHBOARD
   SUPABASE VERSION
========================================================= */

let products = [];
let orders = [];

const PRODUCT_IMAGE_BUCKET = "product-images";


/* =========================================================
   AUTHORIZED VALAR ADMIN EMAILS
========================================================= */

const ADMIN_EMAILS = [
  "mejaalex33@gmail.com",
  "mercydrainagecuthanasia@gmail.com"
];


/* =========================================================
   MONEY FORMAT
========================================================= */

const money = (n) =>
  "MWK " + Number(n || 0).toLocaleString("en-US");


/* =========================================================
   CHECK ADMIN EMAIL
========================================================= */

function isAdminEmail(email) {

  const normalized =
    String(email || "")
      .trim()
      .toLowerCase();

  return ADMIN_EMAILS
    .map(email => email.toLowerCase())
    .includes(normalized);
}


/* =========================================================
   ADMIN GUARD
========================================================= */

async function guard() {

  if (!window.valarSupabase) {

    alert(
      "Supabase is not configured. Check config.js."
    );

    console.error(
      "window.valarSupabase is missing."
    );

    return false;
  }

  const {
    data,
    error
  } = await window.valarSupabase.auth.getSession();

  if (error) {

    console.error(
      "Session error:",
      error
    );

    alert(
      "Unable to check administrator session."
    );

    return false;
  }

  if (
    !data ||
    !data.session ||
    !data.session.user
  ) {

    window.location.href = "login.html";

    return false;
  }

  const email =
    String(
      data.session.user.email || ""
    )
      .trim()
      .toLowerCase();

  if (!isAdminEmail(email)) {

    await window.valarSupabase
      .auth
      .signOut();

    alert(
      "You are not authorized to access the VALAR admin panel."
    );

    window.location.href = "login.html";

    return false;
  }

  const emailElement =
    document.getElementById("adminEmail");

  if (emailElement) {
    emailElement.textContent = email;
  }

  return true;
}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function load() {

  if (!await guard()) {
    return;
  }

  try {

    const [
      productsResult,
      ordersResult
    ] = await Promise.all([

      window.valarSupabase
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      window.valarSupabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false
        })

    ]);

    if (productsResult.error) {

      console.error(
        "Products error:",
        productsResult.error
      );

      alert(
        "Unable to load products:\n\n" +
        productsResult.error.message
      );

      return;
    }

    if (ordersResult.error) {

      console.error(
        "Orders error:",
        ordersResult.error
      );

      alert(
        "Unable to load orders:\n\n" +
        ordersResult.error.message
      );

      return;
    }

    products =
      Array.isArray(productsResult.data)
        ? productsResult.data
        : [];

    orders =
      Array.isArray(ordersResult.data)
        ? ordersResult.data
        : [];

    render();

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    alert(
      "Unable to connect to the VALAR database."
    );
  }
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function render() {

  const productCount =
    document.getElementById("productCount");

  const orderCount =
    document.getElementById("orderCount");

  const salesTotal =
    document.getElementById("salesTotal");

  if (productCount) {
    productCount.textContent =
      products.length;
  }

  if (orderCount) {
    orderCount.textContent =
      orders.length;
  }

  const sales =
    orders
      .filter(order =>
        order.payment_status === "paid" ||
        order.payment_method ===
          "Cash on delivery / pickup"
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0
      );

  if (salesTotal) {
    salesTotal.textContent =
      money(sales);
  }


  /* =======================================================
     PRODUCTS TABLE
  ======================================================= */

  const productsBody =
    document.getElementById("productsBody");

  if (productsBody) {

    if (!products.length) {

      productsBody.innerHTML = `
        <tr>
          <td colspan="6">
            No products found.
          </td>
        </tr>
      `;

    } else {

      productsBody.innerHTML =
        products.map(product => `

          <tr>

            <td>
              ${esc(product.name)}
            </td>

            <td>
              ${esc(product.category)}
            </td>

            <td>
              ${money(product.price)}
            </td>

            <td>
              ${Number(product.stock || 0)}
            </td>

            <td>
              ${product.active ? "Yes" : "No"}
            </td>

            <td class="actions">

              <button
                type="button"
                onclick="editProduct('${esc(product.id)}')"
              >
                Edit
              </button>

              <button
                type="button"
                onclick="deleteProduct('${esc(product.id)}')"
              >
                Delete
              </button>

            </td>

          </tr>

        `).join("");
    }
  }


  /* =======================================================
     ORDERS TABLE
  ======================================================= */

  const ordersBody =
    document.getElementById("ordersBody");

  if (ordersBody) {

    if (!orders.length) {

      ordersBody.innerHTML = `
        <tr>
          <td colspan="6">
            No orders found.
          </td>
        </tr>
      `;

    } else {

      ordersBody.innerHTML =

        orders
          .slice(0, 30)
          .map(order => `

            <tr>

              <td>
                ${esc(order.order_number)}
              </td>

              <td>

                ${esc(order.customer_name)}

                <br>

                <small>
                  ${esc(order.phone)}
                </small>

              </td>

              <td>

                ${esc(order.payment_method)}

                <br>

                <small>
                  ${esc(order.payment_status)}
                </small>

              </td>

              <td>
                ${money(order.total)}
              </td>

              <td>

                <select
                  onchange="setStatus(
                    '${esc(order.id)}',
                    this.value
                  )"
                >

                  ${
                    [
                      "new",
                      "confirmed",
                      "processing",
                      "ready",
                      "out_for_delivery",
                      "completed",
                      "cancelled"
                    ]
                    .map(status => `

                      <option
                        value="${status}"
                        ${
                          status ===
                          order.order_status
                            ? "selected"
                            : ""
                        }
                      >
                        ${status}
                      </option>

                    `)
                    .join("")
                  }

                </select>

              </td>

              <td>

                ${
                  order.created_at
                    ? new Date(
                        order.created_at
                      ).toLocaleString()
                    : ""
                }

              </td>

            </tr>

          `)

          .join("");
    }
  }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character])
    );
}


/* =========================================================
   VALAR SUCCESS / MESSAGE MODAL
========================================================= */

function showValarMessage(
  title,
  message
) {

  const backdrop =
    document.getElementById(
      "valarMessageBackdrop"
    );

  const titleElement =
    document.getElementById(
      "valarMessageTitle"
    );

  const textElement =
    document.getElementById(
      "valarMessageText"
    );

  const okButton =
    document.getElementById(
      "valarMessageOk"
    );

  if (
    !backdrop ||
    !titleElement ||
    !textElement ||
    !okButton
  ) {

    console.error(
      "VALAR message modal is missing."
    );

    return;
  }

  titleElement.textContent =
    title;

  textElement.textContent =
    message;

  backdrop.classList.add("show");

  okButton.onclick = function () {

    backdrop.classList.remove("show");
  };
}


/* =========================================================
   VALAR DELETE CONFIRMATION MODAL
========================================================= */

function showDeleteConfirmation(
  productName
) {

  return new Promise(resolve => {

    const backdrop =
      document.getElementById(
        "valarConfirmBackdrop"
      );

    const text =
      document.getElementById(
        "valarConfirmText"
      );

    const cancelButton =
      document.getElementById(
        "valarConfirmCancel"
      );

    const deleteButton =
      document.getElementById(
        "valarConfirmDelete"
      );

    if (
      !backdrop ||
      !text ||
      !cancelButton ||
      !deleteButton
    ) {

      console.error(
        "VALAR confirmation modal is missing."
      );

      resolve(false);

      return;
    }

    text.textContent =
      `Are you sure you want to delete "${productName}"?`;

    backdrop.classList.add("show");


    function finish(result) {

      backdrop.classList.remove("show");

      cancelButton.onclick = null;

      deleteButton.onclick = null;

      resolve(result);
    }


    cancelButton.onclick =
      () => finish(false);

    deleteButton.onclick =
      () => finish(true);

  });
}


/* =========================================================
   IMAGE PREVIEW
========================================================= */

function showImagePreview(file) {

  const preview =
    document.getElementById("imagePreview");

  const previewImg =
    document.getElementById("imagePreviewImg");

  if (!preview || !previewImg) {
    return;
  }

  if (!file) {

    preview.hidden = true;
    previewImg.src = "";

    return;
  }

  if (!file.type.startsWith("image/")) {

    preview.hidden = true;
    previewImg.src = "";

    return;
  }

  const reader =
    new FileReader();

  reader.onload = function () {

    previewImg.src =
      reader.result;

    preview.hidden = false;
  };

  reader.readAsDataURL(file);
}


/* =========================================================
   UPLOAD PRODUCT IMAGE
========================================================= */

async function uploadProductImage(file) {

  if (!file) {
    return null;
  }

  if (!window.valarSupabase) {

    throw new Error(
      "Supabase is not configured."
    );
  }

  const originalName =
    String(
      file.name || "product-file"
    );

  const safeName =
    originalName
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

  const uniqueId =
    typeof crypto !== "undefined" &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString();

  const filePath =
    "products/" +
    uniqueId +
    "-" +
    safeName;

  const {
    error
  } =
    await window.valarSupabase
      .storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type ||
            "application/octet-stream"
        }
      );

  if (error) {

    console.error(
      "Product image upload error:",
      error
    );

    throw error;
  }

  const {
    data
  } =
    window.valarSupabase
      .storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(filePath);

  if (
    !data ||
    !data.publicUrl
  ) {

    throw new Error(
      "Unable to create public image URL."
    );
  }

  return data.publicUrl;
}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function openModal(product = null) {

  const modal =
    document.getElementById("productModal");

  const title =
    document.getElementById("modalTitle");

  const form =
    document.getElementById("productForm");

  if (!modal || !title || !form) {

    console.error(
      "Product modal elements are missing."
    );

    return;
  }

  modal.classList.add("show");

  title.textContent =
    product
      ? "Edit Product"
      : "Add Product";

  form.reset();


  /* =======================================================
     RESET IMAGE PREVIEW
  ======================================================= */

  const preview =
    document.getElementById("imagePreview");

  const previewImg =
    document.getElementById("imagePreviewImg");

  if (preview) {
    preview.hidden = true;
  }

  if (previewImg) {
    previewImg.src = "";
  }


  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  if (!product) {

    if (form.elements.active) {
      form.elements.active.checked = true;
    }

    return;
  }


  /* =======================================================
     EDIT PRODUCT
  ======================================================= */

  if (form.elements.id) {

    form.elements.id.value =
      product.id || "";
  }

  if (form.elements.name) {

    form.elements.name.value =
      product.name || "";
  }

  if (form.elements.category) {

    form.elements.category.value =
      product.category || "T-Shirts";
  }

  if (form.elements.price) {

    form.elements.price.value =
      product.price ?? "";
  }

  if (form.elements.stock) {

    form.elements.stock.value =
      product.stock ?? "";
  }

  if (form.elements.sizes) {

    form.elements.sizes.value =
      Array.isArray(product.sizes)
        ? product.sizes.join(", ")
        : "";
  }

  if (form.elements.colors) {

    form.elements.colors.value =
      Array.isArray(product.colors)
        ? product.colors.join(", ")
        : "";
  }

  if (form.elements.active) {

    form.elements.active.checked =
      product.active !== false;
  }


  /* =======================================================
     EXISTING IMAGE
  ======================================================= */

  if (
    product.image_url &&
    preview &&
    previewImg
  ) {

    previewImg.src =
      product.image_url;

    preview.hidden = false;
  }
}


/* =========================================================
   CLOSE PRODUCT MODAL
========================================================= */

function closeModal() {

  const modal =
    document.getElementById("productModal");

  if (modal) {
    modal.classList.remove("show");
  }
}


/* =========================================================
   FIND PRODUCT BY ID
========================================================= */

function findProductById(id) {

  const wantedId =
    String(id || "").trim();

  return products.find(product =>
    String(product.id || "").trim() === wantedId
  );
}


/* =========================================================
   EDIT PRODUCT
========================================================= */

window.editProduct = function(id) {

  const product =
    findProductById(id);

  if (!product) {

    console.error(
      "Edit failed. Product not found:",
      id,
      products
    );

    alert(
      "Unable to find this product."
    );

    return;
  }

  openModal(product);
};


/* =========================================================
   DELETE PRODUCT IMAGE
========================================================= */

async function deleteProductImage(imageUrl) {

  if (!imageUrl) {
    return;
  }

  try {

    const marker =
      "/storage/v1/object/public/" +
      PRODUCT_IMAGE_BUCKET +
      "/";

    const position =
      imageUrl.indexOf(marker);

    if (position === -1) {
      return;
    }

    const filePath =
      decodeURIComponent(
        imageUrl.substring(
          position + marker.length
        )
      );

    if (!filePath) {
      return;
    }

    const {
      error
    } =
      await window.valarSupabase
        .storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([
          filePath
        ]);

    if (error) {

      console.warn(
        "Storage image deletion failed:",
        error
      );
    }

  } catch (error) {

    console.warn(
      "Unable to remove product image:",
      error
    );
  }
}


/* =========================================================
   DELETE PRODUCT
========================================================= */

window.deleteProduct = async function(id) {

  const product =
    findProductById(id);

  if (!product) {

    console.error(
      "Delete failed. Product not found:",
      id,
      products
    );

    alert(
      "Unable to find this product."
    );

    return;
  }


  /* =======================================================
     SHOW CUSTOM VALAR CONFIRMATION
  ======================================================= */

  const confirmed =
    await showDeleteConfirmation(
      product.name
    );

  if (!confirmed) {
    return;
  }


  try {

    /* =====================================================
       DELETE PRODUCT FROM DATABASE
    ===================================================== */

    const {
      error
    } =
      await window.valarSupabase
        .from("products")
        .delete()
        .eq("id", String(product.id));

    if (error) {

      console.error(
        "Delete product error:",
        error
      );

      alert(
        "Unable to delete product:\n\n" +
        error.message
      );

      return;
    }


    /* =====================================================
       REMOVE IMAGE FROM STORAGE
    ===================================================== */

    if (product.image_url) {

      await deleteProductImage(
        product.image_url
      );
    }


    /* =====================================================
       REFRESH PRODUCTS
    ===================================================== */

    await load();


    /* =====================================================
       SHOW SUCCESS MESSAGE
    ===================================================== */

    showValarMessage(
      "Product Deleted",
      "Product deleted successfully."
    );

  } catch (error) {

    console.error(
      "Delete product exception:",
      error
    );

    alert(
      "Unable to delete product:\n\n" +
      (error.message || error)
    );
  }
};


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

window.setStatus = async function(
  id,
  status
) {

  const {
    error
  } =
    await window.valarSupabase
      .from("orders")
      .update({
        order_status: status
      })
      .eq("id", id);

  if (error) {

    console.error(
      "Order status error:",
      error
    );

    alert(
      "Unable to update order:\n\n" +
      error.message
    );

    return;
  }

  await load();
};


/* =========================================================
   START DASHBOARD
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* =====================================================
       NEW PRODUCT
    ===================================================== */

    const newProduct =
      document.getElementById(
        "newProduct"
      );

    if (newProduct) {

      newProduct.addEventListener(
        "click",
        () => openModal()
      );
    }


    /* =====================================================
       CLOSE PRODUCT MODAL
    ===================================================== */

    const closeModalButton =
      document.getElementById(
        "closeModal"
      );

    if (closeModalButton) {

      closeModalButton.addEventListener(
        "click",
        closeModal
      );
    }


    /* =====================================================
       IMAGE FILE PREVIEW
    ===================================================== */

    const productImage =
      document.getElementById(
        "productImage"
      );

    if (productImage) {

      productImage.addEventListener(
        "change",
        () => {

          const file =
            productImage.files &&
            productImage.files[0];

          showImagePreview(file);
        }
      );
    }


    /* =====================================================
       PRODUCT FORM
    ===================================================== */

    const productForm =
      document.getElementById(
        "productForm"
      );

    if (productForm) {

      productForm.addEventListener(
        "submit",
        async function(event) {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          const id =
            String(
              form.get("id") || ""
            ).trim();


          const imageFile =
            form.get("image");


          /* =================================================
             FIND EXISTING PRODUCT
          ================================================= */

          const existingProduct =
            id
              ? findProductById(id)
              : null;


          /* =================================================
             BASIC PRODUCT DATA
          ================================================= */

          const product = {

            name:
              String(
                form.get("name") || ""
              ).trim(),

            category:
              String(
                form.get("category") || ""
              ).trim(),

            price:
              Number(
                form.get("price") || 0
              ),

            stock:
              Number(
                form.get("stock") || 0
              ),

            sizes:
              String(
                form.get("sizes") || ""
              )
              .split(",")
              .map(
                value =>
                  value.trim()
              )
              .filter(Boolean),

            colors:
              String(
                form.get("colors") || ""
              )
              .split(",")
              .map(
                value =>
                  value.trim()
              )
              .filter(Boolean),

            image_url:
              existingProduct &&
              existingProduct.image_url
                ? existingProduct.image_url
                : "",

            active:
              form.get("active") === "on"
          };


          /* =================================================
             UPLOAD NEW IMAGE
          ================================================= */

          if (
            imageFile &&
            imageFile instanceof File &&
            imageFile.size > 0
          ) {

            try {

              product.image_url =
                await uploadProductImage(
                  imageFile
                );

            } catch (uploadError) {

              console.error(
                "Image upload failed:",
                uploadError
              );

              alert(
                "Unable to upload the product file:\n\n" +
                uploadError.message
              );

              return;
            }
          }


          /* =================================================
             UPDATE EXISTING PRODUCT
          ================================================= */

          if (id) {

            if (!existingProduct) {

              alert(
                "The product you are trying to edit could not be found."
              );

              return;
            }


            const {
              error
            } =
              await window.valarSupabase
                .from("products")
                .update(product)
                .eq("id", id);


            if (error) {

              console.error(
                "Update product error:",
                error
              );

              alert(
                "Unable to update product:\n\n" +
                error.message
              );

              return;
            }


            /* ===============================================
               DELETE OLD IMAGE IF NEW IMAGE WAS UPLOADED
            =============================================== */

            if (
              imageFile &&
              imageFile instanceof File &&
              imageFile.size > 0 &&
              existingProduct.image_url &&
              existingProduct.image_url !==
                product.image_url
            ) {

              await deleteProductImage(
                existingProduct.image_url
              );
            }


            /* ===============================================
               CLOSE PRODUCT FORM
            =============================================== */

            closeModal();

            await load();


            /* ===============================================
               VALAR SUCCESS MODAL
            =============================================== */

            showValarMessage(
              "Product Updated",
              "Product updated successfully."
            );


          /* =================================================
             INSERT NEW PRODUCT
          ================================================= */

          } else {

            const {
              error
            } =
              await window.valarSupabase
                .from("products")
                .insert(product);


            if (error) {

              console.error(
                "Insert product error:",
                error
              );

              alert(
                "Unable to save product:\n\n" +
                error.message
              );

              return;
            }


            closeModal();

            await load();


            showValarMessage(
              "Product Added",
              "Product added successfully."
            );
          }

        }
      );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logout =
      document.getElementById(
        "logout"
      );

    if (logout) {

      logout.addEventListener(
        "click",
        async () => {

          await window.valarSupabase
            .auth
            .signOut();

          window.location.href =
            "login.html";
        }
      );
    }


    /* =====================================================
       START
    ===================================================== */

    load();

  }
);