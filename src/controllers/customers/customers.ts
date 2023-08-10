import { Request, Response } from "express";
import {
  Customer,
  CustomerResponse,
  customerType,
} from "../../Interfaces/Customer.interface";
import { LinkedPrecedence } from "../../Common/enumVariables";
import prisma from "../../common/prismaClient";

/**
 *
 * @param req
 * @param res
 * @returns customerIntentity
 */
export const handleCustomerIdentity = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).send("At least email or phoneNumber is mandatory");
    }

    const matchingCustomer: Customer | null = await findMatchingCustomer(
      email,
      phoneNumber
    );

    if (matchingCustomer) {
      const result = await prepareResponse(email, phoneNumber);
      return res.status(200).send(result);
    }

    const sharingCustomer: Customer[] = await findSharingCustomers(
      email,
      phoneNumber
    );

    if (!sharingCustomer.length) {
      await createNewCustomer(email, phoneNumber);
    }

    const primaryCustomerId = sharingCustomer.length
      ? sharingCustomer[0].id
      : 0;

    let isEmailExists = true;
    let isPhoneExists = true;
    await Promise.all(
      sharingCustomer.map(async (customer, index) => {
        if (
          index !== 0 &&
          customer.linkPrecedence === LinkedPrecedence.primary
        ) {
          const updatedCustomer: customerType = {
            id: customer.id,
            phoneNumber: customer.phoneNumber,
            email: customer.email,
            linkPrecedence: LinkedPrecedence.secondary,
            linkedId: primaryCustomerId,
          };
          await updateCustomer(updatedCustomer);
        }

        isEmailExists = email && customer.email !== email ? false : true;
        isPhoneExists =
          phoneNumber && customer.phoneNumber !== phoneNumber ? false : true;
      })
    );

    if (!isEmailExists || !isPhoneExists) {
      await createSecondaryCustomer(
        email,
        phoneNumber,
        primaryCustomerId,
        LinkedPrecedence.secondary
      );
    }

    const result = await prepareResponse(email, phoneNumber);
    return res.status(200).send(result);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

/**
 * Function to find the exact phone and email matching customer
 * @param email
 * @param phoneNumber
 * @returns customer
 */
async function findMatchingCustomer(
  email: string | null,
  phoneNumber: string | null
): Promise<Customer | null> {
  const customer: Customer | null = await prisma.contact.findFirst({
    where: {
      AND: [{ email: email }, { phoneNumber: phoneNumber }],
    },
  });
  return customer;
}

/**
 * Function to find the sharing phone or email customers
 * @param email
 * @param phoneNumber
 * @returns customers
 */
async function findSharingCustomers(
  email: string | null,
  phoneNumber: string | null
): Promise<Customer[]> {
  const customers: Customer[] = await prisma.contact.findMany({
    where: {
      OR: [{ email: email }, { phoneNumber: phoneNumber }],
    },
  });
  return customers;
}

/**
 * Function to create new customer
 * @param email
 * @param phoneNumber
 */
async function createNewCustomer(
  email: string | null,
  phoneNumber: string | null
): Promise<void> {
  await prisma.contact.create({
    data: {
      email: email,
      phoneNumber: phoneNumber,
      linkedId: null,
      linkPrecedence: LinkedPrecedence.primary,
    },
  });
}

/**
 * Function to update customer
 * @param customer
 */
async function updateCustomer(customer: customerType): Promise<void> {
  await prisma.contact.update({
    where: { id: customer.id },
    data: customer,
  });
}

/**
 * Function to create secondary customer
 * @param email
 * @param phoneNumber
 * @param linkedId
 * @param linkPrecedence
 */
async function createSecondaryCustomer(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | undefined,
  linkPrecedence: string
): Promise<void> {
  await prisma.contact.create({
    data: {
      email,
      phoneNumber,
      linkedId,
      linkPrecedence,
    },
  });
}

/**
 * Function to prepare customer response
 * @param email
 * @param phoneNumber
 * @returns
 */
async function prepareResponse(
  email: string | null,
  phoneNumber: string | null
): Promise<CustomerResponse> {
  const allCustomerRecords = await prisma.contact.findMany({
    select: {
      id: true,
      linkedId: true,
    },
    where: { OR: [{ email: email }, { phoneNumber: phoneNumber }] },
    orderBy: [
      {
        linkPrecedence: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  let allCustomerIds: number[] = await getAllLinkedIds(
    filterUniqueIds(allCustomerRecords)
  );

  const requiredCustomerRecords = await prisma.contact.findMany({
    where: { id: { in: allCustomerIds } },
    orderBy: {
      createdAt: "asc",
    },
  });

  const primaryId = requiredCustomerRecords[0].id;
  const emailSet: Set<string | null> = new Set();
  const phoneNumberSet: Set<string | null> = new Set();
  const secondaryContactIdsSet: Set<number | null> = new Set();

  for (const customer of requiredCustomerRecords) {
    if (customer?.email) {
      emailSet.add(customer.email);
    }
    if (customer?.phoneNumber) {
      phoneNumberSet.add(customer.phoneNumber);
    }
    if (customer?.linkPrecedence !== LinkedPrecedence.primary) {
      secondaryContactIdsSet.add(customer.id);
    }
  }

  const transformedOutput: CustomerResponse = {
    contact: {
      email: Array.from(emailSet),
      phoneNumber: Array.from(phoneNumberSet),
      secondaryContactIds: Array.from(secondaryContactIdsSet),
      primaryContactId: primaryId,
    },
  };

  return transformedOutput;
}

const getAllLinkedIds = async (initialIds: number[]): Promise<number[]> => {
  let setSize = -1;
  let intialSetIds = new Set(initialIds);
  while (setSize < intialSetIds.size) {
    setSize = intialSetIds.size;
    const recordIds = await prisma.contact.findMany({
      select: {
        id: true,
        linkedId: true,
      },
      where: {
        id: { in: Array.from(intialSetIds) },
      },
    });
    
    for (const record of recordIds) {
      intialSetIds.add(record.id);
      if (record.linkedId) {
        intialSetIds.add(record.linkedId);
      }
    }
  }
  return Array.from(intialSetIds);
};

/**
 * Function to filter and combine unique ids
 * @param array
 * @returns response
 *
 */
function filterUniqueIds(array: customerType[]): number[] {
  return Array.from(
    new Set(array.flatMap((record) => [record.id, record.linkedId]))
  ).filter((id) => id !== null) as number[];
}
