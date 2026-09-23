/* =========================================================
   VALAR ADMIN DASHBOARD
   SUPABASE VERSION
   PRODUCTS + ORDERS + STOCK REQUESTS
   CASH ON DELIVERY / PICKUP
========================================================= */


let products = [];
let orders = [];
let stockRequests = [];


const PRODUCT_IMAGE_BUCKET =
  "product-images";


/* =========================================================
   AUTHORIZED VALAR ADMIN EMAILS
========================================================= */

const ADMIN_EMAILS = [
  "mejaalex33@gmail.com",
  "mercydrainagecuthanasia@gmail.com"
];


/* =========================================================
   ORDER STATUS
========================================================= */

const ORDER_STATUSES = [
  "new",
  "confirmed",
  "processing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled"
];


/* =========================================================
   MONEY FORMAT
========================================================= */

const money = (n) => {

  return (
    "MWK " +
    Number(n || 0).toLocaleString("en-US")
  );

};


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
  } =
    await window.valarSupabase.auth.getSession();


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

    window.location.href =
      "login.html";

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


    window.location.href =
      "login.html";


    return false;

  }


  const emailElement =
    document.getElementById(
      "adminEmail"
    );


  if (emailElement) {

    emailElement.textContent =
      email;

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

    /* =====================================================
       PRODUCTS
    ===================================================== */

    const productsResult =
      await window.valarSupabase
        .from("products")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


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


    products =
      Array.isArray(productsResult.data)
        ? productsResult.data
        : [];


    /* =====================================================
       ORDERS
    ===================================================== */

    const ordersResult =
      await window.valarSupabase
        .from("orders")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


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


    orders =
      Array.isArray(ordersResult.data)
        ? ordersResult.data
        : [];


    /* =====================================================
       STOCK REQUESTS

       IMPORTANT:
       This is what makes customer stock requests
       appear inside the admin dashboard.
    ===================================================== */

    const stockRequestsResult =
      await window.valarSupabase
        .from("stock_requests")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (stockRequestsResult.error) {

      console.error(
        "Stock requests error:",
        stockRequestsResult.error
      );


      /*
         Do not stop the entire dashboard if the
         stock_requests table has an RLS/table problem.
      */

      stockRequests = [];


      const stockBody =
        document.getElementById(
          "stockRequestsBody"
        );


      if (stockBody) {

        stockBody.innerHTML = `

          <tr>

            <td
              colspan="7"
              class="empty-state"
            >
              Unable to load stock requests.
              <br>
              <small>
                ${esc(
                  stockRequestsResult.error.message
                )}
              </small>
            </td>

          </tr>

        `;

      }

    } else {

      stockRequests =
        Array.isArray(
          stockRequestsResult.data
        )
          ? stockRequestsResult.data
          : [];

    }


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
   FORMAT DELIVERY DATE
========================================================= */

function formatDeliveryDate(
  dateValue
) {

  if (!dateValue) {
    return "Not set";
  }


  const date =
    new Date(
      dateValue + "T00:00:00"
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "Not set";

  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

}


/* =========================================================
   GET PAYMENT DISPLAY
========================================================= */

function paymentStatusLabel(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "completed":
      return "Completed";

    case "cash_pending":
      return "Cash pending";

    case "pending":
      return "Pending";

    case "failed":
      return "Failed";

    case "paid":
      return "Paid";

    default:
      return status || "Pending";

  }

}


/* =========================================================
   FIND PRODUCT
========================================================= */

function findProductById(id) {

  const wantedId =
    String(id || "").trim();


  return products.find(
    product =>
      String(
        product.id || ""
      ).trim() === wantedId
  );

}


/* =========================================================
   GET STOCK REQUEST PRODUCT NAME
========================================================= */

function getStockRequestProductName(
  request
) {

  if (!request) {
    return "Unknown product";
  }


  /*
     First try fields that may already contain
     the product name.
  */

  if (request.product_name) {

    return request.product_name;

  }


  if (
    typeof request.product === "string" &&
    request.product.trim()
  ) {

    return request.product;

  }


  /*
     Then try product_id against the products
     already loaded into the dashboard.
  */

  if (request.product_id) {

    const product =
      findProductById(
        request.product_id
      );


    if (product) {

      return product.name;

    }

  }


  /*
     Some Supabase responses may contain a
     related product object.
  */

  if (
    request.products &&
    typeof request.products === "object"
  ) {

    if (request.products.name) {

      return request.products.name;

    }

  }


  return (
    request.product_id ||
    "Unknown product"
  );

}


/* =========================================================
   GET REQUESTED QUANTITY
========================================================= */

function getRequestedQuantity(
  request
) {

  if (!request) {
    return 0;
  }


  return Number(
    request.requested_quantity ??
    request.requested_qty ??
    request.quantity ??
    0
  );

}


/* =========================================================
   GET ADDITIONAL QUANTITY
========================================================= */

function getExtraQuantity(
  request
) {

  if (!request) {
    return 0;
  }


  return Number(
    request.extra_quantity ??
    request.extra_qty ??
    request.additional_quantity ??
    request.additional_qty ??
    0
  );

}


/* =========================================================
   GET STOCK REQUEST STATUS
========================================================= */

function getStockRequestStatus(
  request
) {

  if (!request) {
    return "New";
  }


  const status =
    String(
      request.status ||
      request.request_status ||
      "new"
    )
      .trim()
      .toLowerCase();


  if (status === "completed") {
    return "Completed";
  }


  if (status === "contacted") {
    return "Contacted";
  }


  if (status === "cancelled") {
    return "Cancelled";
  }


  if (status === "processing") {
    return "Processing";
  }


  return "New";

}


/* =========================================================
   FORMAT STOCK REQUEST DATE
========================================================= */

function formatStockRequestDate(
  dateValue
) {

  if (!dateValue) {
    return "—";
  }


  const date =
    new Date(dateValue);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "—";

  }


  return date.toLocaleString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function render() {

  const productCount =
    document.getElementById(
      "productCount"
    );


  const orderCount =
    document.getElementById(
      "orderCount"
    );


  const stockRequestCount =
    document.getElementById(
      "stockRequestCount"
    );


  const salesTotal =
    document.getElementById(
      "salesTotal"
    );


  /* =======================================================
     PRODUCT COUNT
  ======================================================= */

  if (productCount) {

    productCount.textContent =
      products.length;

  }


  /* =======================================================
     ORDER COUNT
  ======================================================= */

  if (orderCount) {

    orderCount.textContent =
      orders.length;

  }


  /* =======================================================
     STOCK REQUEST COUNT
  ======================================================= */

  if (stockRequestCount) {

    stockRequestCount.textContent =
      stockRequests.length;

  }


  /* =======================================================
     SALES
  ======================================================= */

  const sales =
    orders
      .filter(order => {

        const payment =
          String(
            order.payment_status || ""
          ).toLowerCase();


        return (
          payment === "completed" ||
          payment === "paid"
        );

      })
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.total || 0
          ),
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
    document.getElementById(
      "productsBody"
    );


  if (productsBody) {

    if (!products.length) {

      productsBody.innerHTML = `

        <tr>

          <td
            colspan="6"
            class="empty-state"
          >
            No products found.
          </td>

        </tr>

      `;

    } else {

      productsBody.innerHTML =
        products
          .map(product => `

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

          `)
          .join("");

    }

  }


  /* =======================================================
     STOCK REQUESTS TABLE
  ======================================================= */

  const stockRequestsBody =
    document.getElementById(
      "stockRequestsBody"
    );


  if (stockRequestsBody) {

    if (!stockRequests.length) {

      /*
         Only show this if load() did not already
         put an error message in the table.
      */

      stockRequestsBody.innerHTML = `

        <tr>

          <td
            colspan="7"
            class="empty-state"
          >
            No stock requests found.
          </td>

        </tr>

      `;

    } else {

      stockRequestsBody.innerHTML =
        stockRequests
          .map(request => {

            const productName =
              getStockRequestProductName(
                request
              );


            const requestedQty =
              getRequestedQuantity(
                request
              );


            const extraQty =
              getExtraQuantity(
                request
              );


            const status =
              getStockRequestStatus(
                request
              );


            const customerName =
              request.customer_name ||
              request.name ||
              "Not provided";


            const phone =
              request.phone ||
              request.customer_phone ||
              "Not provided";


            return `

              <tr>

                <!-- CUSTOMER -->

                <td>
                  ${esc(customerName)}
                </td>


                <!-- PHONE -->

                <td>
                  ${esc(phone)}
                </td>


                <!-- PRODUCT -->

                <td>
                  <strong>
                    ${esc(productName)}
                  </strong>
                </td>


                <!-- REQUESTED -->

                <td>
                  ${requestedQty}
                </td>


                <!-- ADDITIONAL -->

                <td>
                  ${extraQty}
                </td>


                <!-- STATUS -->

                <td>
                  <span>
                    ${esc(status)}
                  </span>
                </td>


                <!-- DATE -->

                <td>
                  ${esc(
                    formatStockRequestDate(
                      request.created_at
                    )
                  )}
                </td>

              </tr>

            `;

          })
          .join("");

    }

  }


  /* =======================================================
     ORDERS TABLE
  ======================================================= */

  const ordersBody =
    document.getElementById(
      "ordersBody"
    );


  if (ordersBody) {

    if (!orders.length) {

      ordersBody.innerHTML = `

        <tr>

          <td
            colspan="9"
            class="empty-state"
          >
            No orders found.
          </td>

        </tr>

      `;

    } else {

      ordersBody.innerHTML =

        orders
          .slice(0, 30)
          .map(order => {

            const status =
              order.order_status ||
              "new";


            const paymentStatus =
              paymentStatusLabel(
                order.payment_status
              );


            return `

              <tr>

                <!-- ORDER -->

                <td>

                  <strong>
                    ${esc(
                      order.order_number
                    )}
                  </strong>

                </td>


                <!-- CUSTOMER -->

                <td>

                  ${esc(
                    order.customer_name
                  )}

                  <br>

                  <small>
                    ${esc(
                      order.phone
                    )}
                  </small>

                </td>


                <!-- DELIVERY AREA -->

                <td>

                  <strong>
                    Delivery area
                  </strong>

                  <br>

                  ${esc(
                    order.delivery_location ||
                    "Not provided"
                  )}

                </td>


                <!-- PAYMENT -->

                <td>

                  Cash on delivery / pickup

                  <br>

                  <small>

                    Payment:

                    <strong>
                      ${esc(
                        paymentStatus
                      )}
                    </strong>

                  </small>

                </td>


                <!-- TOTAL -->

                <td>
                  ${money(order.total)}
                </td>


                <!-- ORDER STATUS -->

                <td>

                  <select
                    onchange="setStatus(
                      '${esc(order.id)}',
                      this.value
                    )"
                  >

                    ${
                      ORDER_STATUSES
                        .map(
                          statusOption => `

                            <option
                              value="${statusOption}"
                              ${
                                statusOption === status
                                  ? "selected"
                                  : ""
                              }
                            >
                              ${statusOption}
                            </option>

                          `
                        )
                        .join("")
                    }

                  </select>

                </td>


                <!-- DELIVERY DATE -->

                <td>

                  ${
                    order.delivery_date
                      ? `
                        <strong>
                          ${esc(
                            formatDeliveryDate(
                              order.delivery_date
                            )
                          )}
                        </strong>
                      `
                      : `
                        <span>
                          Not set
                        </span>
                      `
                  }

                </td>


                <!-- ORDER CREATED -->

                <td>

                  ${
                    order.created_at
                      ? new Date(
                          order.created_at
                        ).toLocaleString()
                      : ""
                  }

                </td>


                <!-- ACTIONS -->

                <td class="actions">

                  <button
                    type="button"
                    class="delete-order-button"
                    onclick="deleteOrder('${esc(order.id)}')"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `;

          })
          .join("");

    }

  }

}


/* =========================================================
   SUCCESS MESSAGE MODAL
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

    alert(
      title +
      "\n\n" +
      message
    );

    return;

  }


  titleElement.textContent =
    title;


  textElement.textContent =
    message;


  backdrop.classList.add(
    "show"
  );


  okButton.onclick =
    function() {

      backdrop.classList.remove(
        "show"
      );

    };

}


/* =========================================================
   PRODUCT DELETE CONFIRMATION
========================================================= */

function showDeleteConfirmation(
  productName
) {

  return new Promise(
    resolve => {

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

        resolve(false);

        return;

      }


      text.textContent =
        `Are you sure you want to delete "${productName}"?`;


      backdrop.classList.add(
        "show"
      );


      function finish(result) {

        backdrop.classList.remove(
          "show"
        );


        cancelButton.onclick =
          null;


        deleteButton.onclick =
          null;


        resolve(result);

      }


      cancelButton.onclick =
        () => finish(false);


      deleteButton.onclick =
        () => finish(true);

    }
  );

}


/* =========================================================
   ORDER DELETE CONFIRMATION
========================================================= */

function showOrderDeleteConfirmation(
  order
) {

  return new Promise(
    resolve => {

      const backdrop =
        document.getElementById(
          "valarOrderConfirmBackdrop"
        );


      const text =
        document.getElementById(
          "valarOrderConfirmText"
        );


      const cancelButton =
        document.getElementById(
          "valarOrderConfirmCancel"
        );


      const deleteButton =
        document.getElementById(
          "valarOrderConfirmDelete"
        );


      if (
        !backdrop ||
        !text ||
        !cancelButton ||
        !deleteButton
      ) {

        alert(
          "Order confirmation modal is missing."
        );


        resolve(false);

        return;

      }


      const orderNumber =
        order &&
        order.order_number
          ? order.order_number
          : "this order";


      text.textContent =
        `Are you sure you want to permanently delete order "${orderNumber}"?`;


      backdrop.classList.add(
        "show"
      );


      function finish(result) {

        backdrop.classList.remove(
          "show"
        );


        cancelButton.onclick =
          null;


        deleteButton.onclick =
          null;


        resolve(result);

      }


      cancelButton.onclick =
        () => finish(false);


      deleteButton.onclick =
        () => finish(true);

    }
  );

}


/* =========================================================
   IMAGE PREVIEW
========================================================= */

function showImagePreview(file) {

  const preview =
    document.getElementById(
      "imagePreview"
    );


  const previewImg =
    document.getElementById(
      "imagePreviewImg"
    );


  if (
    !preview ||
    !previewImg
  ) {

    return;

  }


  if (!file) {

    preview.hidden =
      true;

    previewImg.src =
      "";

    return;

  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    preview.hidden =
      true;

    previewImg.src =
      "";

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function() {

      previewImg.src =
        reader.result;

      preview.hidden =
        false;

    };


  reader.readAsDataURL(
    file
  );

}


/* =========================================================
   UPLOAD PRODUCT IMAGE
========================================================= */

async function uploadProductImage(
  file
) {

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
      file.name ||
      "product-file"
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
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .upload(
        filePath,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false,

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
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .getPublicUrl(
        filePath
      );


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

function openModal(
  product = null
) {

  const modal =
    document.getElementById(
      "productModal"
    );


  const title =
    document.getElementById(
      "modalTitle"
    );


  const form =
    document.getElementById(
      "productForm"
    );


  if (
    !modal ||
    !title ||
    !form
  ) {

    console.error(
      "Product modal elements are missing."
    );

    return;

  }


  modal.classList.add(
    "show"
  );


  title.textContent =
    product
      ? "Edit Product"
      : "Add Product";


  form.reset();


  const preview =
    document.getElementById(
      "imagePreview"
    );


  const previewImg =
    document.getElementById(
      "imagePreviewImg"
    );


  if (preview) {

    preview.hidden =
      true;

  }


  if (previewImg) {

    previewImg.src =
      "";

  }


  if (!product) {

    if (form.elements.active) {

      form.elements.active.checked =
        true;

    }

    return;

  }


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
      product.category ||
      "T-Shirts";

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


  if (
    product.image_url &&
    preview &&
    previewImg
  ) {

    previewImg.src =
      product.image_url;


    preview.hidden =
      false;

  }

}


/* =========================================================
   CLOSE PRODUCT MODAL
========================================================= */

function closeModal() {

  const modal =
    document.getElementById(
      "productModal"
    );


  if (modal) {

    modal.classList.remove(
      "show"
    );

  }

}


/* =========================================================
   EDIT PRODUCT
========================================================= */

window.editProduct =
  function(id) {

    const product =
      findProductById(id);


    if (!product) {

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

async function deleteProductImage(
  imageUrl
) {

  if (!imageUrl) {
    return;
  }


  try {

    const marker =
      "/storage/v1/object/public/" +
      PRODUCT_IMAGE_BUCKET +
      "/";


    const position =
      imageUrl.indexOf(
        marker
      );


    if (position === -1) {
      return;
    }


    const filePath =
      decodeURIComponent(
        imageUrl.substring(
          position +
          marker.length
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
        .from(
          PRODUCT_IMAGE_BUCKET
        )
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

window.deleteProduct =
  async function(id) {

    const product =
      findProductById(id);


    if (!product) {

      alert(
        "Unable to find this product."
      );

      return;

    }


    const confirmed =
      await showDeleteConfirmation(
        product.name
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } =
        await window.valarSupabase
          .from("products")
          .delete()
          .eq(
            "id",
            String(product.id)
          );


      if (error) {

        alert(
          "Unable to delete product:\n\n" +
          error.message
        );

        return;

      }


      if (product.image_url) {

        await deleteProductImage(
          product.image_url
        );

      }


      await load();


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
        (
          error.message ||
          error
        )
      );

    }

  };


/* =========================================================
   DELETE ORDER
========================================================= */

window.deleteOrder =
  async function(orderId) {

    const wantedId =
      String(
        orderId || ""
      ).trim();


    if (!wantedId) {

      alert(
        "Unable to identify this order."
      );

      return;

    }


    const order =
      orders.find(
        item =>
          String(
            item.id || ""
          ).trim() === wantedId
      );


    if (!order) {

      alert(
        "Unable to find this order."
      );

      return;

    }


    const confirmed =
      await showOrderDeleteConfirmation(
        order
      );


    if (!confirmed) {
      return;
    }


    try {

      /* ==================================================
         DELETE ORDER ITEMS
      ================================================== */

      const {
        error: itemsError
      } =
        await window.valarSupabase
          .from("order_items")
          .delete()
          .eq(
            "order_id",
            wantedId
          );


      if (itemsError) {

        alert(
          "Unable to delete the order items:\n\n" +
          itemsError.message
        );

        return;

      }


      /* ==================================================
         DELETE ORDER
      ================================================== */

      const {
        error: orderError
      } =
        await window.valarSupabase
          .from("orders")
          .delete()
          .eq(
            "id",
            wantedId
          );


      if (orderError) {

        alert(
          "Unable to delete order:\n\n" +
          orderError.message
        );

        return;

      }


      orders =
        orders.filter(
          item =>
            String(
              item.id || ""
            ).trim() !== wantedId
        );


      render();


      showValarMessage(
        "Order Deleted",
        `Order ${
          order.order_number || ""
        } was deleted successfully.`
      );


    } catch (error) {

      console.error(
        "Delete order exception:",
        error
      );


      alert(
        "Unable to delete order:\n\n" +
        (
          error.message ||
          error
        )
      );

    }

  };


/* =========================================================
   GET DELIVERY DATE
========================================================= */

function askDeliveryDate(
  existingDate = ""
) {

  let date =
    existingDate || "";


  while (!date) {

    const answer =
      window.prompt(
        "Enter the expected delivery / collection date.\n\nExample: 2026-09-18",
        ""
      );


    if (answer === null) {

      return null;

    }


    date =
      answer.trim();


    if (!date) {

      alert(
        "Please enter a delivery date."
      );

      continue;

    }


    const parsed =
      new Date(
        date + "T00:00:00"
      );


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      alert(
        "Invalid date. Please use YYYY-MM-DD."
      );

      date = "";

      continue;

    }

  }


  return date;

}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

window.setStatus =
  async function(
    id,
    status
  ) {

    const wantedId =
      String(
        id || ""
      ).trim();


    const order =
      orders.find(
        item =>
          String(
            item.id || ""
          ).trim() === wantedId
      );


    if (!order) {

      alert(
        "Unable to find this order."
      );

      await load();

      return;

    }


    /* =====================================================
       CONFIRMED
    ===================================================== */

    if (status === "confirmed") {

      const deliveryDate =
        askDeliveryDate(
          order.delivery_date || ""
        );


      if (!deliveryDate) {

        await load();

        return;

      }


      const customerName =
        order.customer_name ||
        "Customer";


      const formattedDate =
        formatDeliveryDate(
          deliveryDate
        );


      const customerMessage =
        `Hello ${customerName}, your VALAR order ${order.order_number} has been confirmed. Your expected delivery/collection date is ${formattedDate}. Please keep your order number for reference.`;


      const {
        error
      } =
        await window.valarSupabase
          .from("orders")
          .update({

            order_status:
              "confirmed",

            delivery_date:
              deliveryDate,

            customer_message:
              customerMessage

          })
          .eq(
            "id",
            wantedId
          );


      if (error) {

        console.error(
          "Confirm order error:",
          error
        );


        alert(
          "Unable to confirm order:\n\n" +
          error.message
        );


        await load();

        return;

      }


      showValarMessage(
        "Order Confirmed",
        `Order ${order.order_number} confirmed. Delivery/collection date: ${formattedDate}.`
      );


      await load();

      return;

    }


    /* =====================================================
       COMPLETED
    ===================================================== */

    if (status === "completed") {

      const confirmed =
        window.confirm(
          `Confirm that cash has been received for order ${order.order_number}?\n\nThe payment status will become Completed and ${money(order.total)} will be added to Sales.`
        );


      if (!confirmed) {

        await load();

        return;

      }


      const customerName =
        order.customer_name ||
        "Customer";


      const customerMessage =
        `Thank you ${customerName}. Your VALAR order ${order.order_number} has been completed. Payment has been received. Thank you for choosing VALAR.`;


      const {
        error
      } =
        await window.valarSupabase
          .from("orders")
          .update({

            order_status:
              "completed",

            payment_status:
              "completed",

            customer_message:
              customerMessage

          })
          .eq(
            "id",
            wantedId
          );


      if (error) {

        console.error(
          "Complete order error:",
          error
        );


        alert(
          "Unable to complete order:\n\n" +
          error.message
        );


        await load();

        return;

      }


      showValarMessage(
        "Payment Received",
        `${money(order.total)} has been added to VALAR sales. Order ${order.order_number} is completed.`
      );


      await load();

      return;

    }


    /* =====================================================
       CANCELLED
    ===================================================== */

    if (status === "cancelled") {

      const confirmed =
        window.confirm(
          `Cancel order ${order.order_number}?`
        );


      if (!confirmed) {

        await load();

        return;

      }


      const {
        error
      } =
        await window.valarSupabase
          .from("orders")
          .update({

            order_status:
              "cancelled",

            customer_message:
              `Your VALAR order ${order.order_number} has been cancelled. Please contact VALAR if you need assistance.`

          })
          .eq(
            "id",
            wantedId
          );


      if (error) {

        alert(
          "Unable to cancel order:\n\n" +
          error.message
        );


        await load();

        return;

      }


      await load();

      return;

    }


    /* =====================================================
       OTHER STATUSES
    ===================================================== */

    const {
      error
    } =
      await window.valarSupabase
        .from("orders")
        .update({

          order_status:
            status

        })
        .eq(
          "id",
          wantedId
        );


    if (error) {

      console.error(
        "Order status error:",
        error
      );


      alert(
        "Unable to update order:\n\n" +
        error.message
      );


      await load();

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
       IMAGE PREVIEW
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


          showImagePreview(
            file
          );

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


          const existingProduct =
            id
              ? findProductById(id)
              : null;


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
             UPLOAD IMAGE
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
                "Unable to upload the product image:\n\n" +
                uploadError.message
              );


              return;

            }

          }


          /* =================================================
             UPDATE PRODUCT
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
                .eq(
                  "id",
                  id
                );


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


            closeModal();


            await load();


            showValarMessage(
              "Product Updated",
              "Product updated successfully."
            );


          } else {


            /* ===============================================
               ADD PRODUCT
            =============================================== */

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
       START DASHBOARD
    ===================================================== */

    load();

  }
);