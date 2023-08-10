import { Request, Response } from "express";
import prisma from "../../common/prismaClient";
import {
  Customer,
  CustomerResponseFields,
  customerType,
} from "../../Interfaces/Customer.interface";
import * as _ from "lodash";

export const customerLogic = async (req: Request, res: Response) => {
  try {
    const email: string | null = req.body.email;
    const phoneNumber: string | null = req.body.phoneNumber;

    //Email or PhoneNumber must present
    if (!email && !phoneNumber) {
      return res.send("Atleast email or PhoneNumber is mandatory");
    }

    //For Existing customer with email and phone
    const matchingCustomer: Customer | any =
      await findCustomersByEmailAndPhoneNumber(email, phoneNumber);

    if (matchingCustomer) {
      const result = await prepareCustomerResponse(email, phoneNumber);
      return res.status(200).send(result);
    }

    //find customers with email or phone
    const sharingCustomer: Customer[] = await findCustomersByEmailOrPhoneNumber(
      email,
      phoneNumber
    );

    //if no customers found then create one
    if (!sharingCustomer.length) {
      await createNewCustomer(email, phoneNumber);
      const result = await prepareCustomerResponse(email, phoneNumber);
      return res.status(200).send(result);
    }

    // try to channge the multiple primary to single primary here itself also send req for nullcheck

    //if email matches but phone doesn't then we need to insert that record with primary mail
    //if multiple primary linkedPrecedence are there,
    //update them to secondary by linking the oldest primary id
    //The first element will be always primary if this scenario happens since the record is sorted by createdAt
    const linkId = sharingCustomer[0].id;

    sharingCustomer.forEach(async (customer, index) => {
      if (index !== 0 && customer.linkPrecedence === "primary") {
        const updatedCustomer: customerType = {
          id: customer.id,
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          linkPrecedence: "secondary",
          linkedId: linkId,
        };
        await updateCustomer(updatedCustomer);
      }
      if (
        email &&
        phoneNumber &&
        (customer.email !== email || customer.phoneNumber !== phoneNumber)
      ) {
        await createExistingCustomer(email, phoneNumber, linkId, "secondary");
      }
    });
    const result = await prepareCustomerResponse(email, phoneNumber);
    return res.status(200).send(result);
  } catch (e) {
    console.log(e);
  }
};

async function findCustomersByEmailAndPhoneNumber(
  email: string | null,
  phoneNumber: string | null
) {
  try {
    const customer: Customer | null = await prisma.customerInfo.findFirst({
      where: {
        AND: [{ email: email }, { phoneNumber: phoneNumber }],
      },
    });

    return customer;
  } catch (error) {
    return [];
  }
}

async function findCustomersByEmailOrPhoneNumber(
  email: string | null,
  phoneNumber: string | null
): Promise<Customer[]> {
  const customer: Customer[] = await prisma.customerInfo.findMany({
    where: {
      OR: [{ email: email }, { phoneNumber: phoneNumber }],
    },
  });

  return customer;
}

async function createNewCustomer(
  email: string | null,
  phoneNumber: string | null
) {
  const customers = await prisma.customerInfo.create({
    data: {
      email: email,
      phoneNumber: phoneNumber,
      linkedId: null,
      linkPrecedence: "primary",
    },
  });
  return customers;
}

async function updateCustomer(customer: customerType) {
  const customers = await prisma.customerInfo.update({
    where: { id: customer.id },
    data: customer,
  });
  return customers;
}

async function createExistingCustomer(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number,
  linkPrecedence: string
) {
  const customers = await prisma.customerInfo.create({
    data: {
      email,
      phoneNumber,
      linkedId,
      linkPrecedence,
    },
  });
  return customers;
}

async function prepareCustomerResponse(
  email: string | null,
  phoneNumber: string | null
) {
  const allCustomerRecords = await prisma.customerInfo.findMany({
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

  //get all the customerIds that are linked as well as primary ones
  const allCustomerIds: number[] = filterUniqueIds(allCustomerRecords);
  const requiredCustomerRecords = await prisma.customerInfo.findMany({
    where: { id: { in: allCustomerIds } },
    orderBy: {
      createdAt: "asc",
    },
  });
  const primaryId = requiredCustomerRecords[0].id;

  //reducer to transform the customerList to API response
  const responseFields: CustomerResponseFields = requiredCustomerRecords.reduce(
    (accumulator, customer: Customer) => {
      accumulator.primaryContactId = primaryId;
      if (customer?.email) {
        accumulator.email = [
          ...new Set([...accumulator.email, customer.email]),
        ];
      }

      if (customer?.phoneNumber) {
        accumulator.phoneNumber = [
          ...new Set([...accumulator.phoneNumber, customer.phoneNumber]),
        ];
      }
      if (customer.linkPrecedence !== "primary") {
        accumulator.secondaryContactIds = [
          ...new Set([...accumulator.secondaryContactIds, customer.id]),
        ];
      }
      return accumulator;
    },
    {
      email: [],
      phoneNumber: [],
      secondaryContactIds: [],
      primaryContactId: 0,
    } as CustomerResponseFields
  );

  const transformedOutput = {
    contact: {
      responseFields,
    },
  };

  return transformedOutput;
}

function filterUniqueIds(array: Customer[]) {
  return Array.from(
    new Set(array.flatMap((record) => [record.id, record.linkedId]))
  )?.filter((id) => id !== null) as number[];
}



  // const responseFields: CustomerResponseFields = requiredCustomerRecords.reduce(
  //   (accumulator, customer: Customer) => {
  //     if (customer?.email) {
  //       accumulator.email.push(customer.email);
  //     }
  //     if (customer?.phoneNumber) {
  //       accumulator.phoneNumber.push(customer.phoneNumber);
  //     }
  //     if (customer.linkPrecedence !== LinkedPrecedence.primary) {
  //       accumulator.secondaryContactIds.push(customer.id);
  //     }
  //     return accumulator;
  //   },
  //   {
  //     email: [],
  //     phoneNumber: [],
  //     secondaryContactIds: [],
  //     primaryContactId: primaryId,
  //   } as CustomerResponseFields
  // );

  // const transformedOutput = {
  //   contact: {
  //     responseFields,
  //   },
  // };
